import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { NotificationRoot } from "@/components/notifications/NotificationRoot";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme-provider";
import { TamboProviderWrapper } from "@/components/providers/tambo-provider-wrapper";
import { LeetCodeSyncGate } from "@/components/leetcode";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataSyncProvider } from "@/components/providers/DataSyncProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Suspense fallback={null}>
              <AuthGuard>
                <DataSyncProvider>
                  <TamboProviderWrapper>
                    <main id="main-content" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      {children}
                    </main>
                  </TamboProviderWrapper>
                </DataSyncProvider>
              </AuthGuard>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
        <Footer />
        <LeetCodeSyncGate />
        <NotificationRoot />
      </body>
    </html>
  );
}
