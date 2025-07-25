-- Migration 006: Create media table for Supabase Storage integration
-- Issue #6: Supabase Storage設定とメディア管理基盤構築
-- 
-- IMPORTANT: Execute this in Supabase Dashboard > SQL Editor

-- =============================================================================
-- STEP 1: CREATE MEDIA TABLE
-- =============================================================================

CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by TEXT NOT NULL, -- Auth0 user ID (TEXT format)
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_media_project_id ON public.media(project_id);
CREATE INDEX idx_media_uploaded_by ON public.media(uploaded_by);
CREATE INDEX idx_media_uploaded_at ON public.media(uploaded_at DESC);

-- =============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================================================

-- Policy: Users can only access media for projects they own
CREATE POLICY "Users can access media for their projects" ON public.media
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()::TEXT
        )
    );

-- =============================================================================
-- STEP 4: CREATE STORAGE BUCKET (Execute separately if needed)
-- =============================================================================

-- Create the project-media bucket for file storage
-- Note: This might need to be done via Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-media',
    'project-media', 
    false,  -- private bucket
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- =============================================================================
-- STEP 5: CREATE STORAGE RLS POLICIES
-- =============================================================================

-- Policy: Users can upload to their project folders
CREATE POLICY "Users can upload to their project folders" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-media' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.projects WHERE owner_id = auth.uid()::TEXT
        )
    );

-- Policy: Users can view their project media
CREATE POLICY "Users can view their project media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-media' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.projects WHERE owner_id = auth.uid()::TEXT
        )
    );

-- Policy: Users can update/delete their project media
CREATE POLICY "Users can update their project media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-media' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.projects WHERE owner_id = auth.uid()::TEXT
        )
    );

CREATE POLICY "Users can delete their project media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-media' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.projects WHERE owner_id = auth.uid()::TEXT
        )
    );

-- =============================================================================
-- VERIFICATION QUERIES (Optional - run after migration)
-- =============================================================================

-- Verify media table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'media' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'media';

-- Verify RLS policies for media table
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'media';

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'project-media';

-- Verify storage policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%project media%';

-- =============================================================================
-- EXPECTED RESULTS AFTER MIGRATION
-- =============================================================================

-- ✅ media table created with proper foreign key to projects
-- ✅ RLS enabled and policies configured for project-based access
-- ✅ Storage bucket 'project-media' created with file restrictions
-- ✅ Storage RLS policies enforce project ownership verification
-- ✅ Performance indexes created for common query patterns