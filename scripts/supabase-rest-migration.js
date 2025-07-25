#!/usr/bin/env node

// Using built-in fetch (Node.js 18+)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function tryRestApiMigration() {
  console.log('🔧 Attempting migration via Supabase REST API...');
  
  // Method 1: Try to use PostgREST admin endpoints
  try {
    console.log('📝 Method 1: Trying PostgREST admin endpoints...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/version`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      }
    });
    
    const result = await response.text();
    console.log('📊 PostgREST version response:', result);
    
  } catch (error) {
    console.log('⚠️ Method 1 failed:', error.message);
  }

  // Method 2: Try direct SQL execution via edge functions
  try {
    console.log('📝 Method 2: Trying edge functions endpoint...');
    
    const sqlCommands = [
      'ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;',
      'ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT \'\';',
      'CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);'
    ];
    
    for (const sql of sqlCommands) {
      console.log(`  Executing: ${sql}`);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/sql-exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('  ✅ Success:', result);
      } else {
        console.log('  ⚠️ Failed:', response.status, await response.text());
      }
    }
    
  } catch (error) {
    console.log('⚠️ Method 2 failed:', error.message);
  }

  // Method 3: Try management API
  try {
    console.log('📝 Method 3: Trying Supabase Management API...');
    
    // Get project reference
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('📍 Project reference:', projectRef);
    
    if (projectRef) {
      const managementResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'ALTER TABLE projects DROP COLUMN IF EXISTS owner_id; ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT \'\';'
        })
      });
      
      if (managementResponse.ok) {
        const result = await managementResponse.json();
        console.log('✅ Management API success:', result);
      } else {
        console.log('⚠️ Management API failed:', managementResponse.status, await managementResponse.text());
      }
    }
    
  } catch (error) {
    console.log('⚠️ Method 3 failed:', error.message);
  }

  // Method 4: Try using pg module if available
  try {
    console.log('📝 Method 4: Checking if pg module available...');
    
    const pg = await import('pg');
    console.log('📦 pg module found, attempting direct connection...');
    
    // This would require connection string, which we don't have
    console.log('⚠️ Direct PostgreSQL connection requires connection string');
    
  } catch (error) {
    console.log('⚠️ Method 4 failed: pg module not available');
  }

  console.log('\n🎯 Migration Summary:');
  console.log('   All automated migration methods failed');
  console.log('   Manual intervention required via Supabase Dashboard');
  console.log('   SQL Editor access needed for schema changes');
}

tryRestApiMigration();