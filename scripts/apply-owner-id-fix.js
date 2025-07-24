#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔧 Starting owner_id column type migration...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix-owner-id-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('🔍 Verifying the changes...');
    
    // Verify the column type
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'projects')
      .eq('column_name', 'owner_id');
    
    if (columnError) {
      console.error('❌ Error verifying column:', columnError);
    } else {
      console.log('📊 Column verification:', columns);
    }
    
    // Test inserting a project with Auth0 user ID
    const testUserId = 'google-oauth2|105883376570449441986';
    const testProject = {
      name: 'Test Project',
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
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Test passed! Project created:', testData.id);
      
      // Clean up test project
      await supabase.from('projects').delete().eq('id', testData.id);
      console.log('🧹 Test project cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();