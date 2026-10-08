"""Run against an already booted disposable emulator and scripts/e2e-server.js.
Use only a disposable emulator: this installs/grants SMS permissions to the debug app.
No test tokens are written to disk or printed.
"""
import json, os, re, subprocess, time, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

SDK = os.environ.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk'))
ADB = str(Path(SDK) / 'platform-tools/adb')
SERIAL = os.environ.get('ANDROID_SERIAL', 'emulator-5554')
BASE = 'http://127.0.0.1:3101'
ROOT = Path(__file__).resolve().parent.parent
assert SERIAL.startswith('emulator-'), 'This test resets/configures only disposable Android emulators'

def adb(*args):
    return subprocess.check_output([ADB, '-s', SERIAL, *args], timeout=30)

def api(path, data=None, token=None, admin=False):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    if admin: headers.update({'Cookie': cookie, 'X-CSRF-Token': csrf})
    req = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
    response = urllib.request.urlopen(req, timeout=10)
    return json.load(response)['data'], response.headers

def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/sms-center-ui.xml')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/sms-center-ui.xml')).iter('node'))

def tap_node(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def tap(text, scroll=False):
    for _ in range(6 if scroll else 1):
        for node in nodes():
            if node.get('text') == text:
                bounds = list(map(int, re.findall(r'\d+', node.get('bounds'))))
                if bounds[3] > bounds[1] and bounds[1] < 2300:
                    tap_node(node); return
        if scroll: adb('shell', 'input', 'swipe', '540', '1950', '540', '950', '400')
    raise AssertionError('UI element not found: ' + text)

login, headers = api('/api/admin/login', {'username': 'admin', 'password': 'e2e-only-admin-password'})
cookie = headers['Set-Cookie'].split(';')[0]; csrf = login['csrfToken']
if login.get('mustChangePassword'):
    api('/api/admin/password', {'currentPassword': 'e2e-only-admin-password', 'newPassword': 'e2e-android-changed-password'}, admin=True)
    login, headers = api('/api/admin/login', {'username': 'admin', 'password': 'e2e-android-changed-password'})
    cookie = headers['Set-Cookie'].split(';')[0]; csrf = login['csrfToken']
device, _ = api('/api/admin/devices', {'name': 'Android emulator smoke'}, admin=True)
query, _ = api('/api/admin/tokens', {'name': 'Android smoke query', 'signatures': ['Emulator'], 'deviceIds': [device['id']]}, admin=True)
adb('install', '-r', '-g', str(ROOT/'android/app/build/outputs/apk/debug/app-debug.apk'))
adb('reverse', 'tcp:3101', 'tcp:3101')
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'am', 'start', '-n', 'com.smscenter.app/.MainActivity')
tap('连接与设置')
fields = [n for n in nodes() if n.get('class') == 'android.widget.EditText']
assert len(fields) >= 2
for field, value in zip(fields[:2], ['http://127.0.0.1:3101', device['uploadToken']]):
    tap_node(field)
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    adb('shell', 'input', 'keyevent', *(['KEYCODE_DEL'] * 100))
    adb('shell', 'input', 'text', value)
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
tap('保存连接设置', scroll=True)
if not any(n.get('class') == 'android.widget.Switch' and n.get('checked') == 'true' for n in nodes()):
    tap('开启验证码短信采集', scroll=True)
    tap('同意并开启')
expected_code = str(int(time.time()) % 900000 + 100000)
adb('emu', 'sms', 'send', '10690000', '[Emulator] Your verification code is ' + expected_code + '.')
result = None
for _ in range(30):
    time.sleep(1)
    try:
        result, _ = api('/api/v1/codes/latest?signature=Emulator', token=query['token'])
        if result['code'] == expected_code: break
        result = None
    except urllib.error.HTTPError as error:
        if error.code != 404: raise
assert result is not None, 'SMS did not reach server in 30 seconds'
assert result['code'] == expected_code
assert result['deviceId'] == device['id']
# Keep the Activity out of the foreground, then repeat with the display off.
service = adb('shell', 'dumpsys', 'activity', 'services', 'com.smscenter.app').decode()
assert 'isForeground=true' in service, 'Continuous capture foreground service is not running'
for screen_off in (False, True):
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    if screen_off: adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP')
    expected_code = str(int(expected_code) + 1)
    started = time.monotonic()
    adb('emu', 'sms', 'send', '10690000', '[Emulator] Your verification code is ' + expected_code + '.')
    result = None
    for _ in range(15):
        time.sleep(0.5)
        try:
            result, _ = api('/api/v1/codes/latest?signature=Emulator', token=query['token'])
            if result['code'] == expected_code: break
            result = None
        except urllib.error.HTTPError as error:
            if error.code != 404: raise
    assert result is not None, 'Background SMS upload did not complete within 7.5 seconds'
    print('PASS: ' + ('screen-off' if screen_off else 'HOME background') + ' SMS uploaded in %.2fs' % (time.monotonic() - started))
    assert result['deviceId'] == device['id']
# Add a provider inbox row without sending SMS_RECEIVED: exercise the OEM-denial fallback.
expected_code = str(int(expected_code) + 1)
started = time.monotonic()
body = '[Emulator] Your verification code is ' + expected_code + '.'
adb('shell', 'cmd', 'appops', 'set', 'com.android.shell', 'WRITE_SMS', 'allow')
adb('shell', 'content', 'insert', '--uri', 'content://sms/inbox',
    '--bind', 'address:s:10690000', '--bind', 'body:s:"' + body + '"',
    '--bind', 'date:l:' + str(int(time.time() * 1000)), '--bind', 'type:i:1')
result = None
for _ in range(24):
    time.sleep(0.5)
    result, _ = api('/api/v1/codes/latest?signature=Emulator', token=query['token'])
    if result['code'] == expected_code: break
    result = None
assert result is not None, 'Provider-only inbox row was not captured without a SMS broadcast'
print('PASS: provider-only SMS uploaded in %.2fs without SMS_RECEIVED' % (time.monotonic() - started))
# Let the provider catch up to all broadcast rows before checking duplicate suppression.
time.sleep(6)
records, _ = api('/api/admin/messages?deviceId=' + device['id'] + '&signature=Emulator', admin=True)
assert records['total'] == 4, 'Broadcast and provider paths duplicated a SMS'
print('PASS: 4 distinct SMS deliveries produce exactly 4 server records')
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'am', 'start', '-n', 'com.smscenter.app/.MainActivity')
# Default SMS heads-up notifications can briefly intercept navigation taps.
time.sleep(6)
tap('接收统计')
(ROOT/'artifacts').mkdir(exist_ok=True)
(ROOT/'artifacts/android-statistics.png').write_bytes(adb('exec-out', 'screencap', '-p'))
assert any('Emulator' in node.get('text', '') for node in nodes())
assert 'FATAL EXCEPTION' not in adb('logcat', '-d', '-s', 'AndroidRuntime:E').decode()
print('PASS: emulator SMS broadcast → encrypted queue → HTTP upload → scoped latest-code API')
