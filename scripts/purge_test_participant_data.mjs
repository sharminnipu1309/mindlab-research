// scripts/purge_test_participant_data.mjs
// Safely deletes all test participant data, sessions, and task logs from live Supabase.
// Leaves experiment_configs, admin_users, and database schema completely intact.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function purgeTestData() {
  console.log('===============================================================');
  console.log('  Memtiva — Purging Test Participant Data for Fresh Collection');
  console.log('===============================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  // 1. Authenticate as Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@mindlab.io',
    password: 'mindlab2024',
  });
  if (authErr) {
    throw new Error(`Admin authentication failed: ${authErr.message}`);
  }
  console.log('✅ Admin session authenticated successfully.\n');

  // 2. Count before purge
  const tables = [
    'hanoi_moves',
    'hanoi_puzzles',
    'corsi_trials',
    'stroop_trials',
    'task_switching_trials',
    'sessions',
    'participants',
  ];

  console.log('--- Initial Row Counts ---');
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) console.error(`Error counting ${table}:`, error.message);
    else console.log(`  - ${table.padEnd(24)}: ${count} rows`);
  }

  // 3. Delete in reverse dependency order
  console.log('\n--- Purging Participant Data ---');
  for (const table of tables) {
    // Delete all rows where id is not null (matches all rows in the table)
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`❌ Failed to delete from ${table}:`, error.message);
    } else {
      console.log(`✅ Successfully cleared table: ${table}`);
    }
  }

  // 4. Verify post-purge row counts
  console.log('\n--- Verifying Tables Are Empty & Clean ---');
  let allClean = true;
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error verifying ${table}:`, error.message);
      allClean = false;
    } else {
      console.log(`  - ${table.padEnd(24)}: ${count} rows (clean)`);
      if (count !== 0) allClean = false;
    }
  }

  // 5. Verify experiment_configs still exists and intact
  const { count: cfgCount, error: cfgErr } = await supabase.from('experiment_configs').select('*', { count: 'exact', head: true });
  console.log(`\n  - experiment_configs     : ${cfgCount} rows (Configs intact: ${!cfgErr && cfgCount > 0})`);

  if (allClean) {
    console.log('\n🎉 ALL TEST PARTICIPANT DATA SUCCESSFULLY PURGED! DATABASE IS FRESH.');
  } else {
    console.warn('\n⚠️ Some tables still have remaining rows.');
  }
}

purgeTestData().catch(err => {
  console.error('Fatal error during purge:', err);
  process.exit(1);
});
