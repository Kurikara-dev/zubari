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

async function testRLSAfterFix() {
  console.log('🔒 Testing RLS after SELECT policy fix...\n');

  try {
    // Test users table access (should now be blocked)
    console.log('1. Testing users table SELECT access (should be blocked):');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('✅ RLS working: Users SELECT blocked -', usersError.message);
    } else {
      console.log('❌ RLS still not working: Users SELECT allowed', usersData?.length || 0, 'records');
    }

    // Test projects table access (should now be blocked)
    console.log('\n2. Testing projects table SELECT access (should be blocked):');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectsError) {
      console.log('✅ RLS working: Projects SELECT blocked -', projectsError.message);
    } else {
      console.log('❌ RLS still not working: Projects SELECT allowed', projectsData?.length || 0, 'records');
    }

    // Test INSERT (should still be blocked)
    console.log('\n3. Testing INSERT (should remain blocked):');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', name: 'Test User' }
      ]);
    
    if (insertError) {
      console.log('✅ RLS working: INSERT still blocked -', insertError.message);
    } else {
      console.log('❌ Something wrong: INSERT now allowed', insertData);
    }

    console.log('\n🎯 RLS Status Summary:');
    const selectWorking = usersError && projectsError;
    const insertWorking = insertError;
    
    if (selectWorking && insertWorking) {
      console.log('✅ Perfect! All RLS policies are working correctly');
    } else if (insertWorking && !selectWorking) {
      console.log('⚠️  SELECT policies still need to be applied');
    } else {
      console.log('❌ RLS configuration has issues');
    }

  } catch (error) {
    console.error('❌ RLS test failed:', error.message);
  }
}

testRLSAfterFix();