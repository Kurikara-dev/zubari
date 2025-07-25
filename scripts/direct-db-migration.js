#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function performMigration() {
  console.log('🔧 Starting database migration...');
  
  try {
    // Step 1: Drop existing owner_id column
    console.log('📝 Step 1: Dropping existing owner_id column...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;'
    });
    
    if (dropError) {
      console.log('⚠️ Drop column failed (expected if rpc not available):', dropError.message);
    } else {
      console.log('✅ Column dropped successfully');
    }

    // Step 2: Add new TEXT owner_id column
    console.log('📝 Step 2: Adding new TEXT owner_id column...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;'
    });
    
    if (addError) {
      console.log('⚠️ Add column failed:', addError.message);
    } else {
      console.log('✅ New column added successfully');
    }

    // Step 3: Create index
    console.log('📝 Step 3: Creating index...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);'
    });
    
    if (indexError) {
      console.log('⚠️ Index creation failed:', indexError.message);
    } else {
      console.log('✅ Index created successfully');
    }

    // Alternative approach: Try direct schema modification
    console.log('🔄 Trying alternative approach...');
    
    // Check current schema
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'projects')
      .eq('column_name', 'owner_id');
      
    if (schemaError) {
      console.log('⚠️ Schema check failed:', schemaError.message);
      
      // Try PostgreSQL system catalogs instead
      const { data: pgSchema, error: pgError } = await supabase
        .rpc('exec_sql', {
          sql: `SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'projects' AND column_name = 'owner_id';`
        });
        
      if (pgError) {
        console.log('⚠️ PostgreSQL schema check also failed:', pgError.message);
      } else {
        console.log('📊 Current schema:', pgSchema);
      }
    } else {
      console.log('📊 Current schema:', schema);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Execute migration
performMigration();