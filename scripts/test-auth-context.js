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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthContext() {
  console.log('🔍 Testing auth context and RLS evaluation...\n');

  try {
    // Test 1: Check what auth.uid() returns for anon user
    console.log('1. Testing auth.uid() value for anonymous user:');
    const { data: authTest, error: authError } = await supabase
      .rpc('auth_uid_test');
    
    if (authError) {
      console.log('⚠️ Cannot test auth.uid():', authError.message);
    } else {
      console.log('auth.uid() returns:', authTest);
    }

    // Test 2: Check if we can access raw auth context
    console.log('\n2. Testing current session:');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('Session error:', sessionError.message);
    } else {
      console.log('Current session:', session.session ? 'Authenticated' : 'Anonymous');
      console.log('User ID:', session.session?.user?.id || 'null');
    }

    // Test 3: Try to force authentication failure
    console.log('\n3. Testing with explicit null check:');
    
    // Try a query that should explicitly fail with auth check
    const { data: explicitTest, error: explicitError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'should-not-exist');
    
    if (explicitError) {
      console.log('✅ Explicit query blocked:', explicitError.message);
    } else {
      console.log('❌ Explicit query allowed:', explicitTest?.length || 0, 'records');
    }

    // Test 4: Check if tables have any data
    console.log('\n4. Checking if tables have data (this might explain why [] is returned):');
    
    // Count using service role to see actual data
    const serviceClient = createClient(supabaseUrl, envVars.SUPABASE_SERVICE_ROLE_KEY);
    
    const { count: userCount, error: userCountError } = await serviceClient
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    const { count: projectCount, error: projectCountError } = await serviceClient
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    console.log('Actual data in tables:');
    console.log('  Users:', userCountError ? 'Error' : userCount, 'records');
    console.log('  Projects:', projectCountError ? 'Error' : projectCount, 'records');

  } catch (error) {
    console.error('❌ Auth context test failed:', error.message);
  }
}

testAuthContext();