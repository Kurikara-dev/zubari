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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRLSPolicies() {
  console.log('🔍 Debugging RLS policies...\n');

  try {
    // Check if RLS is enabled on tables
    console.log('1. Checking if RLS is enabled:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'projects');
        ` 
      });
    
    if (tablesError) {
      console.log('⚠️ Cannot check table RLS status:', tablesError.message);
    } else {
      console.log('Table RLS status:', tables);
    }

    // Check existing policies
    console.log('\n2. Checking existing policies:');
    const { data: policies, error: policiesError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT schemaname, tablename, policyname, cmd, qual, with_check
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'projects')
          ORDER BY tablename, policyname;
        ` 
      });
    
    if (policiesError) {
      console.log('⚠️ Cannot check policies:', policiesError.message);
    } else {
      console.log('Existing policies:');
      policies?.forEach(policy => {
        console.log(`  ${policy.tablename}.${policy.policyname} [${policy.cmd}]`);
        console.log(`    Condition: ${policy.qual || 'N/A'}`);
      });
    }

    // Test with authenticated vs unauthenticated context
    console.log('\n3. Testing access patterns:');
    
    // Test with service role (should bypass RLS)
    const { data: serviceData, error: serviceError } = await supabase
      .from('users')
      .select('*');
    console.log('Service role access:', serviceError ? `Error: ${serviceError.message}` : `Success (${serviceData?.length || 0} records)`);

    // Test with anon key (should be blocked by RLS)
    const anonClient = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonError } = await anonClient
      .from('users')
      .select('*');
    console.log('Anon access:', anonError ? `Blocked: ${anonError.message}` : `Allowed: ${anonData?.length || 0} records`);

    // Try to manually enable RLS if needed
    console.log('\n4. Ensuring RLS is properly enabled:');
    const { error: rlsError } = await supabase
      .rpc('sql', { 
        query: `
          ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
        ` 
      });
    
    if (rlsError) {
      console.log('⚠️ Cannot enable RLS:', rlsError.message);
    } else {
      console.log('✅ RLS enabled on both tables');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRLSPolicies();