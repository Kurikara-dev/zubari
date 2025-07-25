#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCurrentPolicies() {
  console.log('🔍 Checking current RLS policies...');
  
  try {
    // Try to fetch current policies using information_schema
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'projects');
      
    if (error) {
      console.log('⚠️ pg_policies query failed:', error.message);
      
      // Alternative: Try using supabase introspection
      const { data: tableInfo, error: tableError } = await supabase
        .from('projects')
        .select('*')
        .limit(0);
        
      if (tableError) {
        console.log('⚠️ Table introspection failed:', tableError.message);
      } else {
        console.log('✅ Projects table exists and is accessible');
      }
    } else {
      console.log('📊 Current policies:', data);
    }
    
    // Test current table structure
    console.log('\n🔧 Testing current table structure...');
    
    // Try to insert a test project to see what fails
    const testProject = {
      name: 'Test Project',
      description: 'Testing current schema',
      owner_id: 'google-oauth2|105883376570449441986'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('projects')
      .insert(testProject)
      .select();
      
    if (insertError) {
      console.log('❌ Insert test failed (expected):', insertError.message);
      console.log('   Code:', insertError.code);
      
      if (insertError.code === '22P02') {
        console.log('✅ Confirmed: owner_id column is still UUID type');
        console.log('📝 Migration needed: Change UUID → TEXT');
      }
    } else {
      console.log('🎉 Insert succeeded! Schema may already be fixed');
      console.log('📊 Inserted data:', insertData);
      
      // Clean up test data
      if (insertData && insertData[0]) {
        await supabase
          .from('projects')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test data cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Policy check failed:', error);
  }
}

checkCurrentPolicies();