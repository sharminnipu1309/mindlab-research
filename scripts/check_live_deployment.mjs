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
    { label: 'Contains new Hero description: "Try four brain games that show how well you plan, remember, pay attention, and switch between ideas."', pass: jsResp.body.includes('Try four brain games that show how well you plan, remember, pay attention, and switch between ideas.') },
    { label: 'Contains new Domains description: "Each challenge focuses on one brain skill at a time, using research-style games made for the web."', pass: jsResp.body.includes('Each challenge focuses on one brain skill at a time, using research-style games made for the web.') },
    { label: 'Contains new Study Info description: "MindLab has brain tests built to measure how the mind works."', pass: jsResp.body.includes('MindLab has brain tests built to measure how the mind works.') },
    { label: 'Contains new Research Data text: "Results are recorded for empirical behavioral research."', pass: jsResp.body.includes('Results are recorded for empirical behavioral research.') },
    { label: 'Contains clickable in-progress cards hover styling', pass: jsResp.body.includes('hover:border-[#D97706]') },
    { label: 'Does NOT contain old Hero description: "Take part in four interactive research challenges designed to explore planning"', pass: !jsResp.body.includes('Take part in four interactive research challenges designed to explore planning') },
    { label: 'Does NOT contain old Domains description: "Each challenge isolates a specific cognitive process through structured research"', pass: !jsResp.body.includes('Each challenge isolates a specific cognitive process through structured research') },
    { label: 'Does NOT contain old Data text: "Results are aggregated for empirical behavioral research."', pass: !jsResp.body.includes('Results are aggregated for empirical behavioral research.') },
    { label: 'Contains "See how your mind is working"', pass: jsResp.body.includes('See how your mind is working') },
    { label: 'Does NOT contain "High-Precision Timing"', pass: !jsResp.body.includes('High-Precision Timing') },
    { label: 'Contains "Let\'s get started"', pass: jsResp.body.includes("Let's get started") },
    { label: 'Does NOT contain "Continue to registration"', pass: !jsResp.body.includes('Continue to registration') },
    { label: 'Contains updated study purpose', pass: jsResp.body.includes('This study is about how the brain works. It looks at how well people plan') },
    { label: 'Does NOT contain "What you will be asked to do"', pass: !jsResp.body.includes('What you will be asked to do') },
    { label: 'Does NOT contain "Data collection and privacy"', pass: !jsResp.body.includes('Data collection and privacy') },
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
