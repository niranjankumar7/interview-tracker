import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Next-Auth API Route Handler
 * Handles all OAuth callbacks including Google Sign-In
 * 
 * This route is automatically called by Next-Auth for:
 * - /api/auth/signin - Sign in page
 * - /api/auth/callback/google - Google OAuth callback
 * - /api/auth/signout - Sign out
 * - /api/auth/session - Get session
 * - /api/auth/providers - Get configured providers
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
