/**
 * API Route: POST /api/auth/logout
 * Logout user by clearing the auth cookie
 */

import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ message: 'Logged out successfully' });

    // Clear the auth cookie
    response.cookies.delete('auth-token');

    return response;
}
