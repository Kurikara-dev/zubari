#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function performDirectMigration() {
  try {
    console.log('🔧 Attempting direct table structure migration...');
    
    // Step 1: Check if there are any existing projects
    console.log('📊 Checking existing projects...');
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .limit(5);
    
    if (checkError) {
      console.error('❌ Error checking existing projects:', checkError);
      throw checkError;
    }
    
    console.log(`📊 Found ${existingProjects.length} existing projects`);
    
    if (existingProjects.length > 0) {
      console.log('⚠️  WARNING: Existing projects found. Migration will affect data.');
      console.log('🔍 Sample projects:', existingProjects);
      
      // For safety, let's not proceed with automatic migration if data exists
      console.log('\n❌ MIGRATION HALTED: Data exists in projects table');
      console.log('📋 Manual steps required:');
      console.log('1. Backup existing project data');
      console.log('2. Run SQL migration in Supabase SQL Editor');
      console.log('3. Restore/convert data if needed');
      console.log('\nSQL to run in Supabase SQL Editor:');
      console.log('=====================================');
      
      // Show the SQL that needs to be run manually
      const migrationSQL = `
-- Migration: Change owner_id from UUID to TEXT for Auth0 compatibility

-- Step 1: Add temporary column
ALTER TABLE projects ADD COLUMN owner_id_temp TEXT;

-- Step 2: Copy existing data (convert UUID to TEXT)
UPDATE projects SET owner_id_temp = owner_id::TEXT;

-- Step 3: Drop foreign key constraint if it exists
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

-- Step 4: Drop the original column
ALTER TABLE projects DROP COLUMN owner_id;

-- Step 5: Rename the temporary column
ALTER TABLE projects RENAME COLUMN owner_id_temp TO owner_id;

-- Step 6: Add NOT NULL constraint
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Step 8: Update RLS policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create new RLS policies for TEXT type
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);
`;
      
      console.log(migrationSQL);
      console.log('=====================================');
      
      return false;
    }
    
    // If no existing data, we can try a simpler approach
    console.log('✅ No existing projects found. Proceeding with migration...');
    console.log('⚠️  This approach uses direct SQL commands through Supabase');
    
    // Since we can't execute raw SQL directly, let's suggest the manual approach
    console.log('\n📋 Even with no data, manual SQL execution is recommended');
    console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
    console.log('=====================================');
    
    const simpleMigrationSQL = `
-- Safe migration for empty projects table
ALTER TABLE projects DROP COLUMN owner_id;
ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Update RLS policies for TEXT type
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);
`;
    
    console.log(simpleMigrationSQL);
    console.log('=====================================');
    
    return false;
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    return false;
  }
}

// Run the migration
performDirectMigration();