import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '../extension');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch(existsSync(chrome) ? { executablePath: chrome } : {});
try {
  const page = await browser.newPage();
  for (const size of [16, 48, 128]) {
    const png = await page.evaluate((n) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = n;
      const ctx = canvas.getContext('2d');
      ctx.scale(n / 128, n / 128);
      ctx.fillStyle = '#087d65';
      ctx.beginPath();
      ctx.roundRect(0, 0, 128, 128, 22);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(21, 26, 86, 65, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(31, 86);
      ctx.lineTo(30, 108);
      ctx.lineTo(55, 89);
      ctx.fill();
      ctx.fillStyle = '#087d65';
      ctx.font = 'bold 51px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('#', 64, 77);
      return canvas.toDataURL('image/png').split(',')[1];
    }, size);
    await fs.writeFile(path.join(root, `icon${size}.png`), Buffer.from(png, 'base64'));
  }
} finally {
  await browser.close();
}
