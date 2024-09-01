import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import Header from './components/Header';
import { Toaster } from 'sonner'
import './toast.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Who Covers It?",
  description: "Identify journalists, bloggers, and publications to pitch your story",
  icons: {
    icon: "/openai.svg",
  },
};

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