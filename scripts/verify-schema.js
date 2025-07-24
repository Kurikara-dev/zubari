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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying Supabase schema...\n');

  try {
    // Check tables exist
    console.log('1. Checking table existence:');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table:', usersError.message);
    } else {
      console.log('✅ Users table: exists');
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projectsError) {
      console.log('❌ Projects table:', projectsError.message);
    } else {
      console.log('✅ Projects table: exists');
    }

    // Check RLS policies
    console.log('\n2. Checking RLS policies:');
    
    const { data: rlsUsers, error: rlsUsersError } = await supabase
      .rpc('get_table_rls_status', { table_name: 'users' })
      .single();
    
    if (rlsUsersError) {
      console.log('⚠️  Unable to check RLS status for users table:', rlsUsersError.message);
    } else {
      console.log('✅ Users table RLS status checked');
    }

    // Check basic table structure
    console.log('\n3. Checking table structure:');
    
    // Get table information using information_schema
    const { data: userColumns, error: userColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');
    
    if (userColError) {
      console.log('⚠️  Unable to check users table structure:', userColError.message);
    } else {
      console.log('✅ Users table structure:');
      userColumns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }

    const { data: projectColumns, error: projectColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'projects')
      .eq('table_schema', 'public');
    
    if (projectColError) {
      console.log('⚠️  Unable to check projects table structure:', projectColError.message);
    } else {
      console.log('✅ Projects table structure:');
      projectColumns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
  }
}

verifySchema();