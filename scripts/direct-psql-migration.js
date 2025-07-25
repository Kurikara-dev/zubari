#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Client } = pkg;

// Use Node.js pg client to execute migration directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Parse connection info from Supabase URL
const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.error('❌ Invalid Supabase URL format');
  process.exit(1);
}

const projectRef = urlMatch[1];

async function executeMigrationViaPg() {
  try {
    console.log('🔧 Executing migration via Node.js pg client...');
    
    // Create direct PostgreSQL connection using service role
    // Supabase allows service role key as password for direct connections
    // Use Supabase REST API to execute raw SQL instead
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔧 Attempting to execute migration via Supabase RPC...');
    
    // Try using sql extension if available
    const migrationSQL = `
-- Safe migration for empty projects table
ALTER TABLE projects DROP COLUMN owner_id;
ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Update RLS policies for TEXT type
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only delete their own projects" ON projects;

CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);
`;

    // Let's create a stored procedure to execute the migration
    const createProcedure = await supabase.rpc('create_migration_procedure', {
      migration_sql: migrationSQL
    });
    
    if (createProcedure.error) {
      console.log('⚠️  RPC approach failed, using alternative method...');
      console.log('❌ Cannot execute DDL commands via REST API');
      console.log('📋 Manual execution required via Supabase Dashboard SQL Editor');
      
      console.log('\n=== COPY THIS SQL TO SUPABASE DASHBOARD ===');
      console.log(migrationSQL);
      console.log('==========================================');
      
      return false;
    }
    
    return true;

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // Execute migration steps one by one
    const migrationSteps = [
      'ALTER TABLE projects DROP COLUMN owner_id',
      'ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id)',
      
      // Drop existing policies
      'DROP POLICY IF EXISTS "Users can view own projects" ON projects',
      'DROP POLICY IF EXISTS "Users can create projects" ON projects',
      'DROP POLICY IF EXISTS "Users can update own projects" ON projects', 
      'DROP POLICY IF EXISTS "Users can delete own projects" ON projects',
      'DROP POLICY IF EXISTS "Users can only see their own projects" ON projects',
      'DROP POLICY IF EXISTS "Users can only insert their own projects" ON projects',
      'DROP POLICY IF EXISTS "Users can only update their own projects" ON projects',
      'DROP POLICY IF EXISTS "Users can only delete their own projects" ON projects',
      
      // Create new policies
      `CREATE POLICY "Users can view own projects" ON projects 
       FOR SELECT USING (owner_id = auth.uid()::TEXT)`,
      `CREATE POLICY "Users can create projects" ON projects 
       FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT)`,
      `CREATE POLICY "Users can update own projects" ON projects 
       FOR UPDATE USING (owner_id = auth.uid()::TEXT)`,
      `CREATE POLICY "Users can delete own projects" ON projects 
       FOR DELETE USING (owner_id = auth.uid()::TEXT)`
    ];

    for (const [index, sql] of migrationSteps.entries()) {
      try {
        console.log(`📝 Executing step ${index + 1}/${migrationSteps.length}: ${sql.substring(0, 50)}...`);
        await client.query(sql);
        console.log(`✅ Step ${index + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Step ${index + 1} failed:`, error.message);
        if (!error.message.includes('does not exist') && !error.message.includes('already exists')) {
          throw error;
        } else {
          console.log(`⚠️  Step ${index + 1} warning (expected): ${error.message}`);
        }
      }
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'owner_id'
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('✅ Schema verification successful:');
      console.log(`   Column: owner_id`);
      console.log(`   Type: ${schemaResult.rows[0].data_type}`);
      console.log(`   Nullable: ${schemaResult.rows[0].is_nullable}`);
    } else {
      console.error('❌ Schema verification failed: owner_id column not found');
    }

    const policiesResult = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies 
      WHERE tablename = 'projects'
      ORDER BY policyname
    `);
    
    console.log(`✅ RLS Policies verification (${policiesResult.rows.length} policies found):`);
    for (const policy of policiesResult.rows) {
      console.log(`   ${policy.policyname} (${policy.cmd})`);
    }

    await client.end();
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ owner_id column is now TEXT type');
    console.log('✅ RLS policies updated for Auth0 compatibility');
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

executeMigrationViaPg();