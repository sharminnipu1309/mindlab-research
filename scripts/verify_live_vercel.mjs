// scripts/verify_live_vercel.mjs
// Verifies live Vercel deployment status and bundle assets

async function verifyLive() {
  console.log('Fetching live Vercel site: https://mindlab-research.vercel.app ...');
  const res = await fetch('https://mindlab-research.vercel.app');
  console.log('HTTP Status:', res.status);
  const html = await res.text();

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'N/A');

  const scriptMatch = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
  console.log('Main Script:', scriptMatch ? scriptMatch[0] : 'N/A');

  if (scriptMatch) {
    const jsRes = await fetch('https://mindlab-research.vercel.app' + scriptMatch[0]);
    const js = await jsRes.text();
    console.log('JS Bundle Size:', js.length, 'bytes');
    console.log('Contains memtiva-logo:', js.includes('memtiva-logo'));
    console.log('Contains 3-Minute Timer:', js.includes('3-Minute Timer'));
    console.log('Contains Memtiva:', js.includes('Memtiva'));
  }

  // Check logo asset directly
  const logoRes = await fetch('https://mindlab-research.vercel.app/memtiva-logo.png');
  console.log('Logo Asset HTTP Status:', logoRes.status, 'Content-Type:', logoRes.headers.get('content-type'));
}

verifyLive().catch(console.error);
