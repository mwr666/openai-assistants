import { Inter } from "next/font/google";
import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
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
    <html lang="en">
      <body className={inter.className}>
        {assistantId ? children : <Warnings />}
        <img className="logo" src="/openai.svg" alt="OpenAI Logo" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
