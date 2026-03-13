import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

/**
 * Next-Auth v5 (Auth.js) configuration
 * Supports both Google OAuth and existing credentials-based auth
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow Google OAuth sign-in
      if (account?.provider === "google") {
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Persist user data to the token
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // Send user data to the client
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // If this is a new user from Google OAuth, create default records
      if (isNewUser && account?.provider === "google") {
        try {
          await prisma.userProgress.create({
            data: {
              userId: user.id,
              currentStreak: 0,
              longestStreak: 0,
              totalTasksCompleted: 0,
            },
          });
          await prisma.userPreferences.create({
            data: {
              userId: user.id,
              theme: "system",
              studyRemindersEnabled: false,
              calendarAutoSyncEnabled: false,
              leetcodeAutoSyncEnabled: false,
            },
          });
        } catch (error) {
          console.error("Error creating default user records:", error);
        }
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
