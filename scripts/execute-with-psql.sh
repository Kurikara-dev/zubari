#!/bin/bash

# Execute migration via psql command
# Usage: ./execute-with-psql.sh

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "❌ SUPABASE_DB_PASSWORD not set in .env.local"
    echo "💡 Add your database password to .env.local:"
    echo "   SUPABASE_DB_PASSWORD=your_password_here"
    echo "💡 Get the password from Supabase Dashboard → Settings → Database"
    exit 1
fi

DB_PASSWORD="$SUPABASE_DB_PASSWORD"
PROJECT_REF="zohgaairklkctyyimiza"

echo "🔧 Executing migration via psql..."

# Try different connection approaches
echo "🔗 Attempting connection to Supabase..."

# Method 1: Direct connection to database
CONN_STRING_DIRECT="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Method 2: Connection pooler  
CONN_STRING_POOLER="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "🔄 Trying direct connection first..."

echo "📝 Executing migration SQL..."

# Try direct connection first
if psql "$CONN_STRING_DIRECT" -c "\dt projects" > /dev/null 2>&1; then
    echo "✅ Direct connection successful!"
    CONN_STRING="$CONN_STRING_DIRECT"
else
    echo "⚠️  Direct connection failed, trying pooler..."
    if psql "$CONN_STRING_POOLER" -c "\dt projects" > /dev/null 2>&1; then
        echo "✅ Pooler connection successful!"
        CONN_STRING="$CONN_STRING_POOLER"
    else
        echo "❌ Both connection methods failed"
        echo "🔍 Debug info:"
        echo "   Direct: $CONN_STRING_DIRECT"
        echo "   Pooler: $CONN_STRING_POOLER"
        exit 1
    fi
fi

echo "🚀 Using connection: ${CONN_STRING%%:*}://[USER]:[HIDDEN]@[HOST]"

psql "$CONN_STRING" << 'EOF'
-- Safe migration for empty projects table
\echo 'Step 1: Dropping existing owner_id column...'
ALTER TABLE projects DROP COLUMN owner_id;

\echo 'Step 2: Adding new TEXT owner_id column...'  
ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL;

\echo 'Step 3: Creating performance index...'
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

\echo 'Step 4: Dropping existing RLS policies...'
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can only delete their own projects" ON projects;

\echo 'Step 5: Creating new RLS policies for TEXT type...'
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (owner_id = auth.uid()::TEXT);

\echo 'Step 6: Verifying migration...'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'owner_id';

\echo 'Step 7: Verifying RLS policies...'
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'projects';

\echo '✅ Migration completed successfully!'
EOF

if [ $? -eq 0 ]; then
    echo "🎉 Migration executed successfully!"
    echo "🧪 Running verification test..."
    
    # Run the compatibility test
    NEXT_PUBLIC_SUPABASE_URL=https://zohgaairklkctyyimiza.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvaGdhYWlya2xrY3R5eWltaXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxOTc5NCwiZXhwIjoyMDY4ODk1Nzk0fQ.CpTOvg7pyCCIS6oJQzLVjy6Ttn3GsfWTierLKgRbdm8 \
    node scripts/test-auth0-compatibility.js
else
    echo "❌ Migration failed. Please check the error messages above."
fi