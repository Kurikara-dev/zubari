#!/usr/bin/env node

// Let's execute the migration via Node.js using the service role key directly
import { createClient } from '@supabase/supabase-js';

console.log('🔧 Using Supabase service role to execute migration...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zohgaairklkctyyimiza.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvaGdhYWlya2xrY3R5eWltaXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxOTc5NCwiZXhwIjoyMDY4ODk1Nzk0fQ.CpTOvg7pyCCIS6oJQzLVjy6Ttn3GsfWTierLKgRbdm8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeManualMigration() {
  try {
    console.log('📋 Since psql connection failed, executing migration steps manually...');
    console.log('⚠️  This will use individual API calls to simulate the migration');
    
    // Step 1: Verify current state
    console.log('\n🔍 Step 1: Verifying current table state...');
    const { data: testInsert, error: currentError } = await supabase
      .from('projects')
      .insert({
        name: 'Migration Test',
        description: 'Testing current state',
        owner_id: 'google-oauth2|105883376570449441986'
      })
      .select()
      .single();
    
    if (currentError && currentError.message.includes('uuid')) {
      console.log('✅ Confirmed: Migration needed (UUID error as expected)');
      console.log('❌ Error:', currentError.message);
    } else if (testInsert) {
      console.log('🎉 Migration may already be complete!');
      console.log('✅ Test project created:', testInsert);
      
      // Clean up
      await supabase.from('projects').delete().eq('id', testInsert.id);
      console.log('🧹 Test project cleaned up');
      return true;
    }
    
    // Since we can't execute DDL via REST API, we need to provide manual instructions
    console.log('\n📋 Manual migration required via Supabase Dashboard:');
    console.log('=====================================');
    console.log('1. Open https://supabase.com/dashboard/project/zohgaairklkctyyimiza');
    console.log('2. Go to SQL Editor');
    console.log('3. Paste and execute this SQL:');
    console.log('');
    
    const migrationSQL = `-- Issue #5: Fix Auth0 user ID compatibility
-- Change owner_id from UUID to TEXT

-- Step 1: Drop existing column
ALTER TABLE projects DROP COLUMN owner_id;

-- Step 2: Add new TEXT column  
ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;

-- Step 3: Create performance index
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Step 4: Update RLS policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Step 5: Create new policies for TEXT type
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);`;

    console.log(migrationSQL);
    console.log('');
    console.log('4. After execution, run: node scripts/test-auth0-compatibility.js');
    console.log('=====================================');
    
    return false; // Manual intervention needed
    
  } catch (error) {
    console.error('❌ Manual migration check failed:', error.message);
    return false;
  }
}

executeManualMigration();