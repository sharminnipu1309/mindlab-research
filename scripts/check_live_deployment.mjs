// scripts/check_live_deployment.mjs
import https from 'https';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function verify() {
  console.log('Fetching live Vercel homepage: https://mindlab-research.vercel.app ...');
  const page = await fetchUrl('https://mindlab-research.vercel.app/?v=' + Date.now());
  console.log('Live page HTTP status:', page.status);

  const jsMatches = page.body.match(/\/assets\/index-[a-zA-Z0-9_\-]+\.js/g);
  if (!jsMatches || jsMatches.length === 0) {
    console.error('Could not find main JS bundle in live HTML.');
    return false;
  }

  const jsUrl = 'https://mindlab-research.vercel.app' + jsMatches[0];
  console.log('Fetching live bundle:', jsUrl);
  const jsResp = await fetchUrl(jsUrl);
  console.log('Live JS bundle status:', jsResp.status, 'size:', jsResp.body.length);

  // Check for newly added strings and removed old strings
  const checks = [
    { label: 'Contains "Back to Home"', pass: jsResp.body.includes('Back to Home') },
    { label: 'Contains "Tasks can be completed in any order"', pass: jsResp.body.includes('Tasks can be completed in any order') },
    { label: 'Does NOT contain "Returning Participant Session Restored"', pass: !jsResp.body.includes('Returning Participant Session Restored') },
    { label: 'Does NOT contain "Your previous progress has been safely loaded"', pass: !jsResp.body.includes('Your previous progress has been safely loaded') },
    { label: 'Does NOT contain "Study Protocol Update"', pass: !jsResp.body.includes('Study Protocol Update') },
    { label: 'Does NOT contain "Room 03 is Currently Locked"', pass: !jsResp.body.includes('Room 03 is Currently Locked') },
    { label: 'Does NOT contain "Room 04 is Currently Locked"', pass: !jsResp.body.includes('Room 04 is Currently Locked') },
  ];

  let allPass = true;
  for (const c of checks) {
    if (c.pass) {
      console.log(`  ✓ Live bundle: ${c.label}`);
    } else {
      console.log(`  ✗ Live bundle: FAIL ${c.label}`);
      allPass = false;
    }
  }

  if (allPass) {
    console.log('\n>>> LIVE VERCEL DEPLOYMENT VERIFIED SUCCESSFULLY! <<<');
    return true;
  } else {
    console.log('\n>>> Live bundle does not match latest commit yet (build may still be in progress). <<<');
    return false;
  }
}

verify().catch(console.error);
