const words = [
  '验证码',
  '校验码',
  '动态码',
  '动态密码',
  '短信密码',
  '验证代码',
  '一次性密码',
  'verification code',
  'security code',
  'one-time password',
  'one time password',
  'one-time code',
  'passcode',
  'otp',
  'code',
];
export function signatureOf(body, sender) {
  const normalized = body.normalize('NFKC');
  const match = normalized.match(/【([^【】\r\n]{1,64})】|\[([^\[\]\r\n]{1,64})\]/u);
  return (match ? (match[1] || match[2]).trim() : '') || sender.trim();
}
export function extractCode(body, rule = {}) {
  const text = body.normalize('NFKC');
  const lowered = text.toLowerCase();
  const keywords = rule.keyword ? [rule.keyword.normalize('NFKC').toLowerCase()] : words;
  const anchors = [];
  for (const word of keywords) {
    let index = lowered.indexOf(word);
    while (index >= 0) {
      anchors.push({ start: index, end: index + word.length });
      index = lowered.indexOf(word, index + word.length);
    }
  }
  if (!anchors.length) return null;
  const length = rule.code_length || 0;
  const pattern =
    rule.alphabet === 'alphanumeric'
      ? /(?<![A-Za-z0-9])[A-Za-z0-9]{4,10}(?![A-Za-z0-9])/g
      : /(?<![A-Za-z0-9])\d{4,8}(?![A-Za-z0-9])/g;
  const candidates = [];
  for (const match of text.matchAll(pattern)) {
    if ((length && match[0].length !== length) || !/\d/.test(match[0])) continue;
    for (const anchor of anchors) {
      const after = match.index >= anchor.end;
      const gap = after ? match.index - anchor.end : anchor.start - (match.index + match[0].length);
      if (gap < 0 || gap > 32) continue;
      const between = after
        ? text.slice(anchor.end, match.index)
        : text.slice(match.index + match[0].length, anchor.start);
      // Do not jump over another numeric identifier (e.g. a phone number).
      if (/\d{3,}/.test(between)) continue;
      candidates.push({ code: match[0], score: gap + (after ? 0 : 3) });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.code || null;
}
