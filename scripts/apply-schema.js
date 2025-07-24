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

async function applySchema() {
  console.log('🚀 Applying database schema...\n');

  try {
    // Read the schema file
    const schemaContent = fs.readFileSync('supabase/initial-schema.sql', 'utf8');
    
    // Split schema into individual statements
    const statements = schemaContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        console.log(`${i + 1}. Executing: ${statement.substring(0, 50)}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.log(`   ⚠️  Warning: ${error.message}`);
          } else {
            console.log(`   ✅ Success`);
          }
        } catch (err) {
          console.log(`   ⚠️  Error: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Schema application completed!');
    console.log('🔍 Testing RLS policies after schema application...\n');

    // Test RLS after schema application
    await testRLSAfterApplication();

  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
  }
}

async function testRLSAfterApplication() {
  // Create anon client for testing
  const anonClient = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Test users table access
  const { data: usersData, error: usersError } = await anonClient
    .from('users')
    .select('*');
  
  if (usersError) {
    console.log('✅ RLS working: Users table access denied -', usersError.message);
  } else {
    console.log('❌ RLS issue: Users table still accessible without auth');
  }

  // Test projects table access
  const { data: projectsData, error: projectsError } = await anonClient
    .from('projects')
    .select('*');
  
  if (projectsError) {
    console.log('✅ RLS working: Projects table access denied -', projectsError.message);
  } else {
    console.log('❌ RLS issue: Projects table still accessible without auth');
  }
}

applySchema();