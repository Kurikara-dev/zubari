#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function executeSupabaseMigration() {
  try {
    console.log('🔧 Attempting Supabase migration...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First, verify current table state
    console.log('📊 Checking current table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('⚠️  Table access error:', tableError.message);
      if (tableError.message.includes('uuid')) {
        console.log('✅ Confirmed: owner_id is still UUID type (needs migration)');
      }
    } else {
      console.log('📊 Current table access successful');
      console.log('Records:', tableInfo?.length || 0);
    }
    
    // Test Auth0 user ID insertion to confirm the problem
    console.log('\n🧪 Testing Auth0 user ID insertion (should fail)...');
    const testProject = {
      name: 'Migration Test Project',
      description: 'Testing Auth0 user ID compatibility',
      owner_id: 'google-oauth2|105883376570449441986'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Expected error (confirms migration needed):', insertError.message);
      
      if (insertError.message.includes('uuid')) {
        console.log('✅ Confirmed: UUID type incompatibility with Auth0 user IDs');
      }
    } else {
      console.log('⚠️  Unexpected: Test insertion succeeded');
      console.log('✅ Migration may already be complete!');
      
      // Clean up test project
      await supabase.from('projects').delete().eq('id', insertData.id);
      console.log('🧹 Test project cleaned up');
      
      return true;
    }
    
    // Since direct SQL execution is not available via REST API, 
    // we need to inform the user to execute manually
    console.log('\n📋 Supabase REST API cannot execute DDL commands');
    console.log('🔧 Manual migration via Supabase Dashboard required');
    
    console.log('\n=== MIGRATION SQL TO EXECUTE IN SUPABASE DASHBOARD ===');
    const migrationSQL = `-- Safe migration for empty projects table
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
    FOR DELETE USING (owner_id = auth.uid()::TEXT);`;

    console.log(migrationSQL);
    console.log('=====================================================');
    
    console.log('\n📋 Steps to complete migration:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click "Run" to execute the migration');
    console.log('4. Run the verification test afterward');
    
    return false; // Indicates manual intervention needed
    
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    return false;
  }
}

executeSupabaseMigration();