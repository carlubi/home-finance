import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PwaRegistration } from "@/components/layout/pwa-registration";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Figtree: humanista y redondeada, la alternativa libre más cercana a Aptos
const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Mis Finanzas",
  title: {
    default: "Mis Finanzas",
    template: "%s · Mis Finanzas",
  },
  description:
    "Gestión de finanzas personales y gastos compartidos con análisis asistido por IA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mis Finanzas",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#171321" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${figtree.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PwaRegistration />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
