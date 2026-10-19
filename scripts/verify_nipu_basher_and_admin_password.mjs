import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Verifying Admin Password & Developer Credit (Nipu Basher) ===\n');

// 1. Verify Code Text in UI Files
console.log('1. Checking Developer Credit across UI components:');
const landing = fs.readFileSync('src/pages/LandingPage.tsx', 'utf-8');
assert(!landing.includes('🧠') && landing.includes('💙') && landing.includes('Nipu Basher'), 'LandingPage footer contains "Designed & Developed with Care by Nipu Basher 💙"');

const adminLogin = fs.readFileSync('src/pages/admin/AdminLogin.tsx', 'utf-8');
assert(adminLogin.includes('Demo: admin2026'), 'AdminLogin has Demo: admin2026');
assert(!adminLogin.includes('🧠') && adminLogin.includes('💙') && adminLogin.includes('Nipu Basher'), 'AdminLogin contains "Designed & Developed with Care by Nipu Basher 💙"');

const adminLayout = fs.readFileSync('src/components/AdminLayout.tsx', 'utf-8');
assert(!adminLayout.includes('🧠') && adminLayout.includes('💙') && adminLayout.includes('Nipu Basher'), 'AdminLayout sidebar contains "Designed & Developed with Care by Nipu Basher 💙"');

const dashboard = fs.readFileSync('src/pages/ParticipantDashboard.tsx', 'utf-8');
assert(!dashboard.includes('🧠') && dashboard.includes('💙') && dashboard.includes('Nipu Basher'), 'ParticipantDashboard contains "Designed & Developed with Care by Nipu Basher 💙"');

// 2. Test Supabase Auth with admin2026
console.log('\n2. Testing Supabase Auth with password "admin2026":');
const supabase = createClient('https://ummiczxtncwvozgvqlih.supabase.co', 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n');

const res = await supabase.auth.signInWithPassword({
  email: 'admin@mindlab.io',
  password: 'admin2026',
});
assert(!res.error && res.data.user?.id === 'cf6baa45-acf5-4959-8b8c-99ba4aec6cf1', 'Supabase Auth successfully authenticates admin with password "admin2026"');

// Also test wrong password is rejected
const wrongRes = await supabase.auth.signInWithPassword({
  email: 'admin@mindlab.io',
  password: 'wrongpassword999',
});
assert(Boolean(wrongRes.error), 'Supabase Auth correctly rejects wrong password');

console.log('\n==================================================');
if (failed === 0) {
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} check(s) did not pass.`);
  process.exit(1);
}
