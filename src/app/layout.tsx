import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationRoot } from "@/components/notifications/NotificationRoot";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme-provider";
import { TamboProviderWrapper } from "@/components/providers/tambo-provider-wrapper";
import { LeetCodeSyncGate } from "@/components/leetcode";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataSyncProvider } from "@/components/providers/DataSyncProvider";
import { AuthGuard } from "@/components/providers/AuthGuard";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DataSyncProvider>
              <TamboProviderWrapper>
                <main id="main-content" className="flex flex-1 min-h-0 flex-col">
                  {children}
                </main>
              </TamboProviderWrapper>
            </DataSyncProvider>
          </AuthProvider>
        </ThemeProvider>
        <Footer />
        <LeetCodeSyncGate />
        <NotificationRoot />
      </body>
    </html>
  );
}
