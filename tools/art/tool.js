// 가공 도구 자동 실행: node tool.js <키> <동작 순서|-> <출력 폴더> <그림...>
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const [key, order, outDir, ...files] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../sprite-tool.html'));
  await pg.selectOption('#key', key);
  if (order !== '-') await pg.fill('#order', order);
  if (process.env.NOWM) await pg.uncheck('#wm');
  if (process.env.WIDE) await pg.fill('#wide', process.env.WIDE);
  await pg.setInputFiles('#file', files);
  await pg.waitForTimeout(2500);
  await pg.click('#run'); await pg.waitForTimeout(4000);
  const info = await pg.evaluate(() => document.getElementById('info').innerText);
  const manifest = await pg.evaluate(() => document.getElementById('manifest').textContent);
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#download')]);
  const name = dl.suggestedFilename(); await dl.saveAs(outDir + '/' + name);
  await pg.screenshot({ path: outDir + '/tool_' + key + '.png', fullPage: true });
  require('fs').writeFileSync(outDir + '/' + key + '.txt', manifest); console.log('INFO:', info); console.log('FILE:', name); console.log('MANIFEST:', manifest);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'OK'); await b.close();
})();
