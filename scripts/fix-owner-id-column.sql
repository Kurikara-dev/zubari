-- Fix owner_id column type from UUID to TEXT to support Auth0 user IDs
-- Auth0 user IDs like "google-oauth2|105883376570449441986" are not valid UUIDs

-- Step 1: Add a temporary column
ALTER TABLE projects ADD COLUMN owner_id_temp TEXT;

-- Step 2: Copy data from UUID column to TEXT column
UPDATE projects SET owner_id_temp = owner_id::TEXT;

-- Step 3: Drop the UUID column
ALTER TABLE projects DROP COLUMN owner_id;

-- Step 4: Rename the temporary column
ALTER TABLE projects RENAME COLUMN owner_id_temp TO owner_id;

-- Step 5: Add NOT NULL constraint
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Step 7: Update RLS policies to work with TEXT type
DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only delete their own projects" ON projects;

-- Create new RLS policies
CREATE POLICY "Users can only see their own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can only insert their own projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can only update their own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can only delete their own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);