import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'

export async function GET(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      // Test 1: Check if supabaseAdmin is configured
      if (!supabaseAdmin) {
        return createErrorResponse('Supabase Admin client not configured - check SUPABASE_SERVICE_ROLE_KEY', 500)
      }

      // Test 2: Try to query projects table
      const { data, error, count } = await supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('owner_id', authRequest.user.sub)
        .limit(1)

      if (error) {
        return createErrorResponse(`Database query error: ${error.message}`, 500)
      }

      // Test 3: Try to create a test project
      const testProject = {
        name: `Test Project ${Date.now()}`,
        description: 'Test project for debugging',
        owner_id: authRequest.user.sub
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from('projects')
        .insert(testProject)
        .select()
        .single()

      if (createError) {
        return createErrorResponse(`Create error: ${createError.message}`, 500)
      }

      // Test 4: Clean up - delete the test project
      if (created) {
        await supabaseAdmin
          .from('projects')
          .delete()
          .eq('id', created.id)
      }

      return createSuccessResponse({
        status: 'All tests passed',
        tests: {
          adminClient: 'OK',
          queryProjects: 'OK',
          createProject: 'OK',
          userId: authRequest.user.sub,
          existingProjectsCount: count || 0
        }
      })
    } catch (error) {
      console.error('Test DB error:', error)
      return createErrorResponse(`Unexpected error: ${error}`, 500)
    }
  })
}