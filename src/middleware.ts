/**
 * Next.js Middleware
 * Handles authentication and freemium checks
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that require usage limit checks
const PROTECTED_PATHS = [
  '/api/applications',
  '/api/chat',
  '/api/usage/track',
];

// Paths that are always public
const PUBLIC_PATHS = [
  '/api/auth',
  '/_next',
  '/favicon',
  '/static',
];

function getJwtSecret(): Uint8Array {
  const jwtSecretString = process.env.JWT_SECRET;
  if (!jwtSecretString) {
    throw new Error('JWT_SECRET not configured');
  }
  return new TextEncoder().encode(jwtSecretString);
}

async function getAuthUser(req: NextRequest) {
  try {
    let token = req.cookies.get('auth-token')?.value;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    const jwtSecret = getJwtSecret();
    const { payload } = await jwtVerify(token, jwtSecret);

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if path needs protection
  const needsProtection = PROTECTED_PATHS.some(p => path.startsWith(p));
  if (!needsProtection) {
    return NextResponse.next();
  }

  // Check authentication
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Add user info to headers for downstream handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-email', user.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};