import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SYSTEM_NAME || "TesoritoOS"} - Restaurant Management`,
  description: `Sistema de gestión integral para ${process.env.NEXT_PUBLIC_APP_NAME || "El Tesorito de Jalisco"}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const primaryColor = process.env.NEXT_PUBLIC_THEME_PRIMARY_COLOR || "#FFB7CE";
  const secondaryColor = process.env.NEXT_PUBLIC_THEME_SECONDARY_COLOR || "#FFD1DC";
  const darkBgColor = process.env.NEXT_PUBLIC_THEME_DARK_BG_COLOR || "#121212";

  return (
    <html
      lang="es"
      style={{
        ["--color-primary" as any]: primaryColor,
        ["--color-secondary" as any]: secondaryColor,
        ["--color-dark" as any]: darkBgColor,
        ["--background" as any]: darkBgColor,
      }}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-dark text-text-light`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
