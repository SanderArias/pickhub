import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { SITE } from "@/config/site";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE.name}`,
    default: SITE.name,
  },
  description: SITE.description,
  icons: {
    icon: '/brand/pickhub-icon-neutral.svg',
    shortcut: '/brand/pickhub-icon-neutral.svg',
    apple: '/brand/pickhub-icon-purple.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextTopLoader
          color="#A855F7"
          height={3}
          showSpinner={false}
          crawl
          crawlSpeed={200}
          easing="ease"
          speed={300}
        />
        {children}
      </body>
    </html>
  );
}
