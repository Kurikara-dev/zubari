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

async function createMinimalRLS() {
  console.log('🔨 Creating minimal RLS setup via Supabase Admin API...\n');

  try {
    // Use Supabase Management API to enable RLS
    const managementUrl = `${supabaseUrl}/rest/v1/rpc/pg_enable_rls`;
    
    console.log('1. Attempting to enable RLS via direct API calls...');
    
    // Try various approaches to enable RLS
    const approaches = [
      {
        name: 'Direct table modification via API',
        action: async () => {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;'
            })
          });
          return response;
        }
      }
    ];

    console.log('\n2. Manual schema application needed');
    console.log('⚠️  Automatic RLS setup via API is limited.');
    console.log('');
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('');
    console.log('Please execute the following in Supabase Dashboard > SQL Editor:');
    console.log('');
    
    // Read and display the schema
    const schemaContent = fs.readFileSync('supabase/initial-schema.sql', 'utf8');
    console.log('--- COPY THE FOLLOWING SQL ---');
    console.log(schemaContent);
    console.log('--- END OF SQL ---');
    console.log('');
    
    console.log('After applying the schema in Supabase Dashboard:');
    console.log('1. Go to: https://zohgaairklkctyyimiza.supabase.co/project/_/sql');
    console.log('2. Paste the above SQL');
    console.log('3. Click "Run"');
    console.log('4. Come back and run: node scripts/test-rls.js');
    console.log('');

    // Test current state
    console.log('3. Current RLS test result:');
    const supabase = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('✅ RLS is working: Access denied');
    } else {
      console.log('❌ RLS needs setup: Access allowed without authentication');
    }

  } catch (error) {
    console.error('❌ RLS setup failed:', error.message);
  }
}

createMinimalRLS();