import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/layout/language-provider";
import { PwaRegistration } from "@/components/layout/pwa-registration";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatus } from "@/components/layout/network-status";
import { LANGUAGE_COOKIE, normalizeLanguage } from "@/lib/language";
import "./globals.css";

// Inter variable: permite los pesos intermedios de Linear (510 / 538)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Todo en Casa",
  title: {
    default: "Todo en Casa",
    template: "%s · Todo en Casa",
  },
  description:
    "Las finanzas, los gastos compartidos y los menús de tu casa, en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Todo en Casa",
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png?v=3", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png?v=3", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);

  return (
    <html
      lang={language}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider initialLanguage={language}>
            <PwaRegistration />
            {children}
            <NetworkStatus />
            <Toaster position="top-center" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
