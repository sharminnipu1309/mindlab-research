import fs from 'fs';

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Verifying Latest Audio & Screenshot Fixes ===\n');

// 1. Verify Logo & Brand Typography (Audio 1 & Screenshot)
console.log('1. Checking Logo component (src/components/Logo.tsx & src/assets/logoData.ts):');
const logoContent = fs.readFileSync('src/components/Logo.tsx', 'utf-8');
const logoDataContent = fs.readFileSync('src/assets/logoData.ts', 'utf-8');
assert(logoDataContent.includes('MEMTIVA_BRAIN_ICON'), 'logoData.ts exports MEMTIVA_BRAIN_ICON');
assert(logoDataContent.includes('MEMTIVA_FULL_LOGO'), 'logoData.ts exports MEMTIVA_FULL_LOGO');
assert(logoDataContent.startsWith('// Generated Memtiva brand assets'), 'logoData.ts has clean header');
assert(logoContent.includes('MEMTIVA_BRAIN_ICON'), 'Logo.tsx imports MEMTIVA_BRAIN_ICON');
assert(logoContent.includes('Mem'), 'Logo.tsx renders "Mem"');
assert(logoContent.includes('tiva'), 'Logo.tsx renders "tiva"');
assert(logoContent.includes('Cognitive Research & Analytics'), 'Logo.tsx renders "Cognitive Research & Analytics"');
assert(!logoContent.includes('import memtivaLogoUrl from'), 'Logo.tsx does not use vulnerable relative import without fallback');

// 2. Verify .gitattributes and assets
console.log('\n2. Checking Git LFS exclusions (.gitattributes):');
const gitAttrContent = fs.readFileSync('.gitattributes', 'utf-8');
assert(gitAttrContent.includes('src/assets/** -filter -diff -merge text'), '.gitattributes exempts src/assets/** from LFS');
assert(gitAttrContent.includes('public/** -filter -diff -merge text'), '.gitattributes exempts public/** from LFS');
assert(gitAttrContent.includes('logo.png -filter -diff -merge text'), '.gitattributes exempts logo.png from LFS');

// 3. Verify Challenge Progress Bar Click -> Room Card Popup (Audio 2)
console.log('\n3. Checking Challenge Progress Click Behavior (src/pages/ParticipantDashboard.tsx):');
const dashboardContent = fs.readFileSync('src/pages/ParticipantDashboard.tsx', 'utf-8');
assert(dashboardContent.includes('const [popupRoomId, setPopupRoomId] = useState<string | null>(null);'), 'ParticipantDashboard has popupRoomId state');
assert(dashboardContent.includes('setPopupRoomId(stage.id);'), 'Stage node onClick sets popupRoomId instead of direct navigation');
assert(dashboardContent.includes('ROOM CARD POPUP MODAL'), 'ParticipantDashboard contains Room Card Popup Modal');
assert(dashboardContent.includes('Room 01'), 'Room Card Modal contains Room 01 info');
assert(dashboardContent.includes('Enter challenge'), 'Room Card Modal contains Enter challenge button');
assert(dashboardContent.includes('Cancel & choose another'), 'Room Card Modal contains Cancel & choose another button');

// 4. Verify version bump
console.log('\n4. Checking package.json version:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
assert(pkg.version === '1.1.0', `package.json version is bumped to 1.1.0 (got ${pkg.version})`);

console.log('\n==================================================');
if (failed === 0) {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} check(s) did not pass.`);
  process.exit(1);
}
