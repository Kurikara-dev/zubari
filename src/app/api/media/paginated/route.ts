import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@auth0/nextjs-auth0';
import { createClient } from '@supabase/supabase-js';
import type { Media } from '@/lib/types/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication (temporarily disabled for Phase 2)
    // const session = await getSession();
    // if (!session?.user) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    
    // Temporary: Authentication disabled for Phase 2 implementation

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const fileType = searchParams.get('fileType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const uploaders = searchParams.get('uploaders');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('media')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (fileType) {
      const types = fileType.split(',').filter(Boolean);
      query = query.in('mime_type', types);
    }

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    if (search) {
      // Case-insensitive filename search using ilike
      query = query.ilike('file_name', `%${search}%`);
    }

    if (uploaders) {
      const uploaderList = uploaders.split(',').filter(Boolean);
      query = query.in('uploaded_by', uploaderList);
    }

    // Apply sorting and pagination
    const validSortColumns = ['created_at', 'file_name', 'file_size', 'uploaded_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    query = query
      .order(sortColumn, { ascending: order === 'asc' })
      .range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch media files' },
        { status: 500 }
      );
    }

    // Calculate pagination info
    const total = count || 0;
    const hasMore = (page + 1) * limit < total;
    const nextCursor = hasMore ? page + 1 : undefined;

    // Transform data to include URLs
    const mediaWithUrls: Media[] = (data || []).map(media => ({
      ...media,
      url: supabase.storage
        .from('project-media')
        .getPublicUrl(media.file_path).data.publicUrl,
    }));

    const response = {
      data: mediaWithUrls,
      nextCursor,
      hasMore,
      total,
      page,
      limit,
      sortBy: sortColumn,
      sortOrder: order,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}