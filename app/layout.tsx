import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import Header from './components/Header';
import { Toaster } from 'sonner'
import './toast.css'
import Image from 'next/image';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({ params, pathname }): Promise<Metadata> {
  const baseTitle = "Who Covers It? | Identify journalists for your story";
  const baseDescription = "Identify journalists, bloggers, and publications to pitch your story. Powered by AI and comprehensive media data.";
  
  let title = baseTitle;
  let description = baseDescription;

  if (pathname === '/dashboard') {
    title = "Dashboard | " + baseTitle;
    description = "View your recent queries and manage your account.";
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    metadataBase: new URL('https://whocoversit.com'),
    alternates: {
      canonical: pathname,
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="alternate" hrefLang="en" href="https://whocoversit.com/en" />
          <link rel="alternate" hrefLang="x-default" href="https://whocoversit.com" />
        </head>
        <body className={`${inter.className} ${getColorSchemeClass()}`}>
          <Header />
          {children}
          <Toaster richColors closeButton />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}

function getColorSchemeClass() {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode';
  }
  return '';
}