import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Auth0のhandleAuthに相当する処理
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const authAction = pathSegments[pathSegments.length - 1];

  console.log('Auth action:', authAction, 'URL:', url.pathname);

  switch (authAction) {
    case 'login':
      const loginUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/authorize?` +
        `response_type=code&` +
        `client_id=${process.env.AUTH0_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(`${process.env.AUTH0_BASE_URL}/api/auth/callback`)}&` +
        `scope=openid profile email&` +
        `state=${Math.random().toString(36).substring(7)}`;
      return Response.redirect(loginUrl);
    
    case 'callback':
      // 認証コードを受け取った後の処理
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code) {
        return new Response('Missing authorization code', { status: 400 });
      }

      try {
        // Auth0からトークンを取得
        const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            code: code,
            redirect_uri: `${process.env.AUTH0_BASE_URL}/api/auth/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const tokens = await tokenResponse.json();
        
        // セッション設定（簡易版）
        const headers = new Headers();
        headers.set('Location', process.env.AUTH0_BASE_URL || '');
        headers.set('Set-Cookie', `auth0_token=${tokens.access_token}; HttpOnly; Path=/; Max-Age=3600`);
        
        return new Response(null, {
          status: 302,
          headers: headers,
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        return Response.redirect(`${process.env.AUTH0_BASE_URL}?error=auth_failed`);
      }
    
    case 'logout':
      const logoutUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?` +
        `client_id=${process.env.AUTH0_CLIENT_ID}&` +
        `returnTo=${encodeURIComponent(process.env.AUTH0_BASE_URL || '')}`;
      
      const logoutHeaders = new Headers();
      logoutHeaders.set('Location', logoutUrl);
      logoutHeaders.set('Set-Cookie', 'auth0_token=; HttpOnly; Path=/; Max-Age=0');
      
      return new Response(null, {
        status: 302,
        headers: logoutHeaders,
      });
    
    default:
      return new Response(`Not Found: ${authAction}`, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}