import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Create client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  console.log('🔧 Fixing RLS policies...\n');

  try {
    console.log('1. Checking current RLS status...');
    
    // Check if RLS is enabled on tables
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', ['users', 'projects'])
      .eq('schemaname', 'public');
    
    if (rlsError) {
      console.log('⚠️  Cannot check RLS status:', rlsError.message);
    } else {
      console.log('RLS Status:', rlsStatus);
    }

    console.log('\n2. Checking existing policies...');
    
    // Check existing policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd, qual, with_check')
      .in('tablename', ['users', 'projects']);
    
    if (policiesError) {
      console.log('⚠️  Cannot check policies:', policiesError.message);
    } else {
      console.log('Existing policies:');
      policies?.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    }

    console.log('\n3. Creating comprehensive test...');
    
    // Create a comprehensive test by trying to enable RLS and create policies directly
    const sqlCommands = [
      'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY'
    ];

    for (const sql of sqlCommands) {
      console.log(`Executing: ${sql}`);
      try {
        // Use a simple query to test access
        const { error } = await supabase.rpc('test_query', { query: sql });
        if (error) {
          console.log(`  ⚠️  ${error.message}`);
        } else {
          console.log(`  ✅ Success`);
        }
      } catch (err) {
        console.log(`  ⚠️  ${err.message}`);
      }
    }

    console.log('\n4. Testing current access patterns...');
    
    // Test with service role (should work)
    const { data: serviceUsers, error: serviceUsersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    console.log('Service role access:', serviceUsersError ? `Error: ${serviceUsersError.message}` : 'Success');

    // Test with anon key
    const anonClient = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonUsers, error: anonUsersError } = await anonClient
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    console.log('Anon access:', anonUsersError ? `Blocked: ${anonUsersError.message}` : 'Allowed (RLS issue)');

  } catch (error) {
    console.error('❌ RLS fix failed:', error.message);
  }
}

fixRLS();