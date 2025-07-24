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

// Create client with anon key (this simulates unauthenticated user)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
  console.log('🔒 Testing Row Level Security policies...\n');

  try {
    // Test 1: Try to read users table without authentication (should fail)
    console.log('1. Testing users table access (unauthenticated):');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('✅ RLS working: Users table access denied -', usersError.message);
    } else {
      console.log('❌ RLS issue: Users table accessible without auth', usersData);
    }

    // Test 2: Try to read projects table without authentication (should fail)
    console.log('\n2. Testing projects table access (unauthenticated):');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectsError) {
      console.log('✅ RLS working: Projects table access denied -', projectsError.message);
    } else {
      console.log('❌ RLS issue: Projects table accessible without auth', projectsData);
    }

    // Test 3: Try to insert into users table (should fail)
    console.log('\n3. Testing users table insert (unauthenticated):');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', name: 'Test User' }
      ]);
    
    if (insertError) {
      console.log('✅ RLS working: Users table insert denied -', insertError.message);
    } else {
      console.log('❌ RLS issue: Users table insert allowed without auth', insertData);
    }

    // Test 4: Try to insert into projects table (should fail)
    console.log('\n4. Testing projects table insert (unauthenticated):');
    const { data: projectInsertData, error: projectInsertError } = await supabase
      .from('projects')
      .insert([
        { name: 'Test Project', description: 'Test', owner_id: '123e4567-e89b-12d3-a456-426614174000' }
      ]);
    
    if (projectInsertError) {
      console.log('✅ RLS working: Projects table insert denied -', projectInsertError.message);
    } else {
      console.log('❌ RLS issue: Projects table insert allowed without auth', projectInsertData);
    }

    console.log('\n✅ RLS policy test completed!');

  } catch (error) {
    console.error('❌ RLS test failed:', error.message);
  }
}

testRLS();