import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthContext";
import { GuestSyncNotice } from "@/components/auth/GuestSyncNotice";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nafis | A space for reflection",
    template: "%s | Nafis",
  },
  description:
    "A calm, thoughtful space for connecting with trusted Islamic resources.",
  other: {
    google: "notranslate",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Nafis | A space for reflection",
    description: "A calm, thoughtful space for connecting with trusted Islamic resources.",
    siteName: "Nafis",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{const p=localStorage.getItem("sakinah-theme")||"system";const d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch{document.documentElement.dataset.theme="light"}',
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Navbar />
            <GuestSyncNotice />
            <main id="main-content">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
