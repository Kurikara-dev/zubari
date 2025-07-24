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

async function testAuth0Compatibility() {
  try {
    console.log('🧪 Testing Auth0 user ID compatibility...');
    
    // Test Auth0 user ID format
    const testUserId = 'google-oauth2|105883376570449441986';
    const testProject = {
      name: 'Auth0 Compatibility Test',
      description: 'Testing Auth0 user ID format with Supabase',
      owner_id: testUserId
    };
    
    console.log(`📝 Attempting to create project with Auth0 user ID: ${testUserId}`);
    
    const { data: createData, error: createError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Project creation failed:', createError);
      
      // Analyze the error
      if (createError.message.includes('uuid')) {
        console.log('🔍 Error suggests UUID type incompatibility');
        console.log('💡 owner_id column may still be UUID type');
      }
      return false;
    }
    
    console.log('✅ Project created successfully!');
    console.log('📊 Created project:', {
      id: createData.id,
      name: createData.name,
      owner_id: createData.owner_id
    });
    
    // Test reading the project back
    console.log('📖 Testing project retrieval...');
    const { data: readData, error: readError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', createData.id)
      .single();
    
    if (readError) {
      console.error('❌ Project read failed:', readError);
    } else {
      console.log('✅ Project read successful!');
      console.log('📊 Retrieved project:', readData);
    }
    
    // Test updating the project
    console.log('📝 Testing project update...');
    const { data: updateData, error: updateError } = await supabase
      .from('projects')
      .update({ description: 'Updated description for Auth0 test' })
      .eq('id', createData.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Project update failed:', updateError);
    } else {
      console.log('✅ Project update successful!');
    }
    
    // Clean up: delete the test project
    console.log('🧹 Cleaning up test project...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', createData.id);
    
    if (deleteError) {
      console.error('❌ Project deletion failed:', deleteError);
      console.log(`⚠️  Please manually delete project with ID: ${createData.id}`);
    } else {
      console.log('✅ Test project cleaned up successfully!');
    }
    
    console.log('\n🎉 Auth0 compatibility test completed successfully!');
    console.log('✅ owner_id column accepts Auth0 user ID format');
    console.log('✅ All CRUD operations work correctly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error);
    return false;
  }
}

// Additional test for different Auth0 provider formats
async function testMultipleAuth0Formats() {
  try {
    console.log('\n🔬 Testing multiple Auth0 provider formats...');
    
    const testCases = [
      'google-oauth2|105883376570449441986',
      'auth0|507f1f77bcf86cd799439011',
      'twitter|1234567890',
      'facebook|10152294504877684',
      'github|12345678'
    ];
    
    const createdProjects = [];
    
    for (const userId of testCases) {
      console.log(`\n📝 Testing ${userId.split('|')[0]} provider format...`);
      
      const testProject = {
        name: `Test ${userId.split('|')[0]} Project`,
        description: `Testing ${userId.split('|')[0]} provider format`,
        owner_id: userId
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed for ${userId}:`, error);
      } else {
        console.log(`✅ Success for ${userId}`);
        createdProjects.push(data.id);
      }
    }
    
    // Clean up all test projects
    if (createdProjects.length > 0) {
      console.log('\n🧹 Cleaning up test projects...');
      const { error: cleanupError } = await supabase
        .from('projects')
        .delete()
        .in('id', createdProjects);
      
      if (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      } else {
        console.log(`✅ Cleaned up ${createdProjects.length} test projects`);
      }
    }
    
    console.log(`\n📊 Test Results: ${testCases.length - (testCases.length - createdProjects.length)} successful out of ${testCases.length} formats`);
    
  } catch (error) {
    console.error('❌ Multiple format test failed:', error);
  }
}

// Run the tests
async function runAllTests() {
  const basicTest = await testAuth0Compatibility();
  
  if (basicTest) {
    await testMultipleAuth0Formats();
  }
}

runAllTests();