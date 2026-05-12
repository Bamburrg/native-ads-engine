import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Native Ads Engine",
  description: "SCRAWLS Copy-Derived native image ad pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <ConvexClientProvider>
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="text-lg font-semibold text-gray-900">
                Native Ads Engine
              </Link>
              <nav className="flex gap-6 text-sm">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  Runs
                </Link>
                <Link href="/recipe" className="text-gray-600 hover:text-gray-900">
                  Recipe
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">{children}</main>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
