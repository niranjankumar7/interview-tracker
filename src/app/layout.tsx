import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationRoot } from "@/components/notifications/NotificationRoot";
import { Footer } from "@/components/layout/Footer";

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <main id="main-content" className="flex flex-1 min-h-0 flex-col">
          {children}
        </main>
        <Footer />
        <NotificationRoot />
      </body>
    </html>
  );
}
