const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 566, height: 284 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const stage = document.getElementById('preview-stage').getBoundingClientRect();
    const tl = document.getElementById('timeline-panel').getBoundingClientRect();
    const ruler = document.getElementById('ruler-wrap').getBoundingClientRect();
    const ph = document.getElementById('playhead').getBoundingClientRect();
    const clips = [...document.querySelectorAll('.clip')].map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.querySelector('.clip-name').textContent, x: Math.round(r.x), w: Math.round(r.width) };
    });
    const active = document.querySelector('#scene [class^="scene-"]');
    return {
      stage: { x: Math.round(stage.x), w: Math.round(stage.width) },
      tl: { x: Math.round(tl.x), w: Math.round(tl.width) },
      ruler: { x: Math.round(ruler.x), w: Math.round(ruler.width) },
      playhead: { x: Math.round(ph.x) },
      clips,
      scene: active ? active.className.split(' ')[0] : 'empty',
      timeLabel: document.getElementById('time-label').textContent,
    };
  });

  await page.locator('#preview-stage').screenshot({ path: 'C:/Users/Administrator/.codex/visualizations/2026/08/05/019fd0dc-a6ac-70d3-99e9-790cf23d1fad/probe-preview.png' });
  await page.locator('#timeline-panel').screenshot({ path: 'C:/Users/Administrator/.codex/visualizations/2026/08/05/019fd0dc-a6ac-70d3-99e9-790cf23d1fad/probe-timeline.png' });
  console.log(JSON.stringify({ info, errors }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
