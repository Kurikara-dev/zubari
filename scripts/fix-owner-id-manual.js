#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function fixOwnerIdColumn() {
  try {
    console.log('🔧 Starting manual owner_id column type migration...');
    
    // Step 1: Check current column type
    console.log('📊 1. Checking current column type...');
    const { data: columnInfo, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'projects')
      .eq('column_name', 'owner_id');
    
    if (columnError) {
      console.error('❌ Error checking column:', columnError);
      throw columnError;
    }
    
    console.log('Current owner_id column:', columnInfo);
    
    if (columnInfo.length === 0) {
      console.error('❌ owner_id column not found in projects table');
      return;
    }
    
    if (columnInfo[0].data_type === 'text') {
      console.log('✅ Column is already TEXT type');
      console.log('🔍 Checking if RLS policies need updating...');
      
      // Test creating a project with Auth0 user ID
      const testUserId = 'google-oauth2|105883376570449441986';
      const testProject = {
        name: 'Test Project Auth0',
        description: 'Testing Auth0 user ID compatibility',
        owner_id: testUserId
      };
      
      console.log('🧪 Testing project creation with Auth0 user ID...');
      const { data: testData, error: testError } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
        .single();
      
      if (testError) {
        console.error('❌ Test failed, RLS policies may need updating:', testError);
        console.log('🔧 Attempting to update RLS policies...');
        await updateRlsPolicies();
      } else {
        console.log('✅ Test passed! Project created:', testData.id);
        // Clean up test project
        await supabase.from('projects').delete().eq('id', testData.id);
        console.log('🧹 Test project cleaned up');
        return;
      }
    }
    
    // If we get here, we need to perform the migration
    console.log('⚠️  Column type migration required');
    console.log('⚠️  This operation requires direct database access');
    console.log('⚠️  Please run the SQL migration manually or use a database admin tool');
    
    // Display the SQL commands that need to be run
    console.log('\n📋 SQL commands to run manually:');
    console.log('=====================================');
    console.log('-- Step 1: Add temporary column');
    console.log('ALTER TABLE projects ADD COLUMN owner_id_temp TEXT;');
    console.log('');
    console.log('-- Step 2: Copy data (if any exists)');
    console.log('UPDATE projects SET owner_id_temp = owner_id::TEXT;');
    console.log('');
    console.log('-- Step 3: Drop old column');
    console.log('ALTER TABLE projects DROP COLUMN owner_id;');
    console.log('');
    console.log('-- Step 4: Rename new column');
    console.log('ALTER TABLE projects RENAME COLUMN owner_id_temp TO owner_id;');
    console.log('');
    console.log('-- Step 5: Add NOT NULL constraint');
    console.log('ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;');
    console.log('');
    console.log('-- Step 6: Create index');
    console.log('CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);');
    console.log('=====================================\n');
    
    console.log('After running the SQL manually, run this script again to update RLS policies.');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    process.exit(1);
  }
}

async function updateRlsPolicies() {
  try {
    console.log('🔧 Updating RLS policies for TEXT type...');
    
    // Note: We can't directly modify RLS policies through the REST API
    // This would require direct database access or the Supabase dashboard
    
    console.log('\n📋 RLS Policy updates needed:');
    console.log('=====================================');
    console.log('-- Drop existing policies');
    console.log('DROP POLICY IF EXISTS "Users can view own projects" ON projects;');
    console.log('DROP POLICY IF EXISTS "Users can create projects" ON projects;');
    console.log('DROP POLICY IF EXISTS "Users can update own projects" ON projects;');
    console.log('DROP POLICY IF EXISTS "Users can delete own projects" ON projects;');
    console.log('');
    console.log('-- Create new policies with TEXT type casting');
    console.log('CREATE POLICY "Users can view own projects" ON projects');
    console.log('    FOR SELECT USING (owner_id = auth.uid()::TEXT);');
    console.log('');
    console.log('CREATE POLICY "Users can create projects" ON projects');
    console.log('    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);');
    console.log('');
    console.log('CREATE POLICY "Users can update own projects" ON projects');
    console.log('    FOR UPDATE USING (owner_id = auth.uid()::TEXT);');
    console.log('');
    console.log('CREATE POLICY "Users can delete own projects" ON projects');
    console.log('    FOR DELETE USING (owner_id = auth.uid()::TEXT);');
    console.log('=====================================\n');
    
    console.log('⚠️  Please run these RLS policy updates manually in your database');
    
  } catch (error) {
    console.error('❌ RLS policy update failed:', error);
    throw error;
  }
}

// Run the migration check
fixOwnerIdColumn();