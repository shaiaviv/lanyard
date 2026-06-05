import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lanyard",
  description: "Conference intelligence for sales teams",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Lanyard" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full`}
      style={{ background: '#07090F', colorScheme: 'dark' }}
    >
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#07090F' }}>
        {children}
      </body>
    </html>
  );
}
