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

export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: "Who Covers It? | Identify journalists for your story",
    description: "Identify journalists, bloggers, and publications to pitch your story. Powered by AI and comprehensive media data.",
    openGraph: {
      title: "Who Covers It? | Identify journalists for your story",
      description: "Identify journalists, bloggers, and publications to pitch your story. Powered by AI and comprehensive media data.",
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: "Who Covers It? | Identify journalists for your story",
      description: "Identify journalists, bloggers, and publications to pitch your story. Powered by AI and comprehensive media data.",
      images: ['/og-image.png'],
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
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