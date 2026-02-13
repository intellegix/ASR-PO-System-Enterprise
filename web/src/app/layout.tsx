import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

export const dynamic = 'force-dynamic';
import "./globals.css";
import { Providers } from "./providers";
import { Box } from "@mui/material";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: 'ASR PO System', template: '%s | ASR PO System' },
  description: "All Surface Roofing Purchase Order Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASR PO System",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Box
          component="a"
          href="#main-content"
          sx={{
            position: 'absolute',
            left: '-9999px',
            '&:focus': {
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 50,
              px: 2,
              py: 1,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 1,
            },
          }}
        >
          Skip to content
        </Box>
        <Providers>{children}</Providers>
        <button id="pwa-install-button" aria-label="Install app">
          📱 Install App
        </button>
      </body>
    </html>
  );
}
