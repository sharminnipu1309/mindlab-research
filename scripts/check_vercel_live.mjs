async function check() {
  try {
    const res = await fetch('https://memtiva.vercel.app?t=' + Date.now());
    const html = await res.text();
    const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!scriptMatch) {
      console.log('Could not find script tag in HTML. HTML sample:', html.substring(0, 200));
      return false;
    }
    const scriptUrl = 'https://memtiva.vercel.app' + scriptMatch[1];
    console.log('Fetching live bundle:', scriptUrl);
    const jsRes = await fetch(scriptUrl);
    const jsText = await jsRes.text();
    console.log('Bundle length:', jsText.length);
    const hasNipuBasher = jsText.includes('Nipu Basher');
    const hasBlueHeart = jsText.includes('💙');
    const hasAdmin2026 = jsText.includes('admin2026');
    console.log('Live bundle checks:');
    console.log('  - Has "Nipu Basher":', hasNipuBasher);
    console.log('  - Has "💙":', hasBlueHeart);
    console.log('  - Has "admin2026":', hasAdmin2026);
    return hasNipuBasher && hasBlueHeart && hasAdmin2026;
  } catch (err) {
    console.error('Error fetching live site:', err.message);
    return false;
  }
}

async function loopCheck() {
  for (let i = 0; i < 15; i++) {
    console.log(`Checking deployment (attempt ${i + 1}/15)...`);
    const live = await check();
    if (live) {
      console.log('>>> VERCEL DEPLOYMENT IS LIVE WITH LATEST FIXES! <<<');
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log('Timed out waiting for Vercel deployment.');
  process.exit(1);
}

loopCheck();
