import { NextRequest, NextResponse } from 'next/server'
import { AuthContext, AuthUser, ApiResponse } from '../types/api'

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser
}

export async function withAuth(
  request: NextRequest,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as ApiResponse,
        { status: 401 }
      )
    }

    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = authContext.user

    return await handler(authenticatedRequest)
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' } as ApiResponse,
      { status: 401 }
    )
  }
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const sessionCookie = request.cookies.get('auth0_session')
  
  if (!sessionCookie) {
    console.error('No auth0_session cookie found')
    return {
      user: null as unknown as AuthUser,
      isAuthenticated: false
    }
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    
    if (!session.user) {
      console.error('No user in session:', session)
      return {
        user: null as unknown as AuthUser,
        isAuthenticated: false
      }
    }

    const user: AuthUser = {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture
    }

    return {
      user,
      isAuthenticated: true
    }
  } catch (error) {
    console.error('Failed to parse session:', error)
    return {
      user: null as unknown as AuthUser,
      isAuthenticated: false
    }
  }
}

export function createErrorResponse(
  message: string, 
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { success: false, error: message } as ApiResponse,
    { status }
  )
}

export function createSuccessResponse<T>(
  data: T, 
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, data } as ApiResponse<T>,
    { status }
  )
}