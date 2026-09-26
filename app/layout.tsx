import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GOSHEN OS | Farm Operations",
  description: "A simple workspace to keep farm operations and records together.",
  manifest: "/manifest.json",
  themeColor: "#14211a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#14211a" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
