import { NextRequest, NextResponse } from 'next/server';

// Auth0の基本的な認証ハンドラー
export async function GET(
  request: NextRequest,
  { params }: { params: { auth0: string } }
) {
  const auth0Action = params.auth0;

  switch (auth0Action) {
    case 'login':
      const loginUrl = new URL('/authorize', process.env.AUTH0_ISSUER_BASE_URL);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID!);
      loginUrl.searchParams.set('redirect_uri', `${process.env.AUTH0_BASE_URL}/api/auth/callback`);
      loginUrl.searchParams.set('scope', 'openid profile email');
      loginUrl.searchParams.set('state', Math.random().toString(36).substring(2));
      
      return NextResponse.redirect(loginUrl.toString());

    case 'logout':
      const logoutUrl = new URL('/v2/logout', process.env.AUTH0_ISSUER_BASE_URL);
      logoutUrl.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID!);
      logoutUrl.searchParams.set('returnTo', process.env.AUTH0_BASE_URL!);
      
      const response = NextResponse.redirect(logoutUrl.toString());
      response.cookies.delete('auth0_session');
      return response;

    case 'callback':
      const code = request.nextUrl.searchParams.get('code');
      
      if (!code) {
        return NextResponse.redirect(`${process.env.AUTH0_BASE_URL}?error=no_code`);
      }

      try {
        // トークン交換
        const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            code,
            redirect_uri: `${process.env.AUTH0_BASE_URL}/api/auth/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Token exchange failed');
        }

        const tokens = await tokenResponse.json();
        
        // ユーザー情報を取得
        const userResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const user = await userResponse.json();
        
        // セッション作成（簡易版）
        const response = NextResponse.redirect(process.env.AUTH0_BASE_URL!);
        response.cookies.set('auth0_session', JSON.stringify({ user, tokens }), {
          httpOnly: true,
          maxAge: 60 * 60 * 24, // 24時間
          path: '/',
        });
        
        return response;
      } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.redirect(`${process.env.AUTH0_BASE_URL}?error=callback_failed`);
      }

    case 'me':
      // ユーザー情報を返す
      const sessionCookie = request.cookies.get('auth0_session');
      
      if (!sessionCookie) {
        return NextResponse.json({ user: null });
      }

      try {
        const session = JSON.parse(sessionCookie.value);
        return NextResponse.json({ user: session.user });
      } catch {
        return NextResponse.json({ user: null });
      }

    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}