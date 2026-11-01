const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function verifyAll() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=d3d11']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERR:', msg.text());
  });
  page.on('pageerror', err => console.error('BROWSER PAGE ERROR:', err.message));

  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Capture 2D Stage
  const stageEl = await page.$('.stage-viewport');
  if (stageEl) {
    await stageEl.screenshot({ path: 'verify_2d_character.png' });
    console.log('Saved verify_2d_character.png');
  }

  // 2. Switch to 3D Print Studio
  await page.click('button[data-tab="3dprint"]');
  await new Promise(r => setTimeout(r, 800));

  const vp3d = await page.$('.stage-viewport-3d');

  // --- A. Front View (Monochrome Clay) ---
  await page.evaluate(() => {
    PrintStudio.setMaterialMode('clay');
    PrintStudio.resetCamera();
  });
  await new Promise(r => setTimeout(r, 500));
  if (vp3d) {
    await vp3d.screenshot({ path: 'verify_3d_front_clay.png' });
    // Also save as verify_3d_front.png for compatibility
    await vp3d.screenshot({ path: 'verify_3d_front.png' });
    console.log('Saved verify_3d_front_clay.png & verify_3d_front.png');
  }

  // --- B. Front View (Colored Preview) ---
  await page.click('button[data-mat="colored"]');
  await page.evaluate(() => {
    PrintStudio.resetCamera();
  });
  await new Promise(r => setTimeout(r, 500));
  if (vp3d) {
    await vp3d.screenshot({ path: 'verify_3d_front_colored.png' });
    console.log('Saved verify_3d_front_colored.png');
  }

  // --- C. Angled View (Monochrome Clay) ---
  await page.click('button[data-mat="clay"]');
  await page.evaluate(() => {
    const s = PrintStudio.getState();
    s.camera.position.set(45, 15, 145);
    s.controls.target.set(0, -2, 0);
    s.controls.update();
  });
  await new Promise(r => setTimeout(r, 500));
  if (vp3d) {
    await vp3d.screenshot({ path: 'verify_3d_angled_clay.png' });
    await vp3d.screenshot({ path: 'verify_3d_angled.png' });
    console.log('Saved verify_3d_angled_clay.png & verify_3d_angled.png');
  }

  // --- D. Angled View (Colored Preview) ---
  await page.click('button[data-mat="colored"]');
  await new Promise(r => setTimeout(r, 500));
  if (vp3d) {
    await vp3d.screenshot({ path: 'verify_3d_angled_colored.png' });
    console.log('Saved verify_3d_angled_colored.png');
  }

  // --- E. Coin / Medallion Mode ---
  await page.click('button[data-type="coin"]');
  await page.evaluate(() => {
    PrintStudio.resetCamera();
  });
  await new Promise(r => setTimeout(r, 600));
  if (vp3d) {
    await vp3d.screenshot({ path: 'verify_3d_coin.png' });
    console.log('Saved verify_3d_coin.png');
  }

  // --- F. Full App Screenshot ---
  await page.screenshot({ path: 'verify_full_app.png' });
  console.log('Saved verify_full_app.png');

  // Verify meshes and metrics
  const stateSummary = await page.evaluate(() => {
    const s = PrintStudio.getState();
    return {
      meshesCount: s.meshes.length,
      metrics: s.metrics,
      layersCount: Object.keys(s.puzzleLayers).length
    };
  });
  console.log('Final State Summary:', JSON.stringify(stateSummary, null, 2));

  await browser.close();
}

verifyAll().catch(console.error);
