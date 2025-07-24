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
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function testRLSWithRealAuth() {
  console.log('🔍 Testing RLS with real authentication flow...\n');

  try {
    // Create service role client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create anon client for testing
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('1. Creating test user via auth.admin...');
    
    // Create a real auth user using admin API
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: 'testuser@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Failed to create auth user:', authError.message);
      return;
    }

    console.log('✅ Created auth user:', authUser.user.id);

    // Wait a moment for trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n2. Creating test project for the user...');
    
    // Insert a project for this user
    const { data: project, error: projectError } = await serviceClient
      .from('projects')
      .insert([{
        name: 'Test Project',
        description: 'A test project for RLS testing',
        owner_id: authUser.user.id
      }])
      .select();

    if (projectError) {
      console.log('❌ Failed to create project:', projectError.message);
    } else {
      console.log('✅ Created project:', project[0].id);
    }

    console.log('\n3. Testing anonymous access (should be blocked now):');
    
    // Test users table
    const { data: anonUsers, error: anonUsersError } = await anonClient
      .from('users')
      .select('*');
    
    console.log('Users table access:', anonUsersError ? `Blocked: ${anonUsersError.message}` : `Allowed: ${anonUsers?.length || 0} records`);

    // Test projects table  
    const { data: anonProjects, error: anonProjectsError } = await anonClient
      .from('projects')
      .select('*');
    
    console.log('Projects table access:', anonProjectsError ? `Blocked: ${anonProjectsError.message}` : `Allowed: ${anonProjects?.length || 0} records`);

    console.log('\n4. Testing authenticated access...');
    
    // Sign in as the test user
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: 'testuser@example.com',
      password: 'testpassword123'
    });

    if (signInError) {
      console.log('❌ Failed to sign in:', signInError.message);
    } else {
      console.log('✅ Signed in successfully');
      
      // Test access as authenticated user
      const { data: authUsers, error: authUsersError } = await anonClient
        .from('users')
        .select('*');
      
      console.log('Authenticated users access:', authUsersError ? `Error: ${authUsersError.message}` : `Success: ${authUsers?.length || 0} records`);

      const { data: authProjects, error: authProjectsError } = await anonClient
        .from('projects')
        .select('*');
      
      console.log('Authenticated projects access:', authProjectsError ? `Error: ${authProjectsError.message}` : `Success: ${authProjects?.length || 0} records`);
    }

    console.log('\n5. Cleaning up test data...');
    
    // Clean up: delete the test user
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(authUser.user.id);
    
    if (deleteError) {
      console.log('⚠️ Failed to delete test user:', deleteError.message);
    } else {
      console.log('✅ Test user cleaned up');
    }

  } catch (error) {
    console.error('❌ RLS test with real auth failed:', error.message);
  }
}

testRLSWithRealAuth();