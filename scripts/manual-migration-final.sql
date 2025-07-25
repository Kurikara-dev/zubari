-- Manual Migration SQL for Issue #5
-- Fix Auth0 user ID compatibility with Supabase UUID columns
-- 
-- IMPORTANT: Execute this in Supabase Dashboard > SQL Editor
-- Prerequisite: projects table is empty (verified: 0 records)

-- =============================================================================
-- STEP 1: ALTER TABLE STRUCTURE
-- =============================================================================

-- Drop the existing UUID column
ALTER TABLE projects DROP COLUMN owner_id;

-- Add new TEXT column for Auth0 user IDs
ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- =============================================================================
-- STEP 2: UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;  
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Alternative policy names (in case they exist)
DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only delete their own projects" ON projects;

-- Create new RLS policies for TEXT type compatibility
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);

-- =============================================================================
-- VERIFICATION QUERIES (Optional - run after migration)
-- =============================================================================

-- Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'owner_id';

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'projects' AND indexname = 'idx_projects_owner_id';

-- Verify RLS policies  
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- =============================================================================
-- POST-MIGRATION TEST
-- =============================================================================

-- Test insert with Auth0 user ID format (should succeed after migration)
-- Note: Replace with actual Auth0 user ID during testing
-- INSERT INTO projects (name, description, owner_id) 
-- VALUES ('Test Project', 'Auth0 compatibility test', 'google-oauth2|105883376570449441986');

-- Expected result after migration:
-- ✅ owner_id column is TEXT type
-- ✅ Accepts Auth0 user ID format: "google-oauth2|105883376570449441986"  
-- ✅ RLS policies work with auth.uid()::TEXT casting
-- ✅ Performance index exists on owner_id column