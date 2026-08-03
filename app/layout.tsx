import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getTenantContext } from "@/lib/tenant";
import { TenantProvider } from "@/components/TenantProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantContext();
  return {
    title: `${tenant.system_name} - Restaurant Management`,
    description: `Sistema de gestión integral para ${tenant.name}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getTenantContext();

  const primaryColor = tenant.primary_color || "#FFB7CE";
  const secondaryColor = tenant.secondary_color || "#FFD1DC";
  const darkBgColor = tenant.dark_bg_color || "#121212";

  return (
    <html
      lang="es"
      style={
        {
          "--color-primary": primaryColor,
          "--color-secondary": secondaryColor,
          "--color-dark": darkBgColor,
          "--background": darkBgColor,
        } as React.CSSProperties
      }
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-dark text-text-light`}
      >
        <TenantProvider tenant={tenant}>
          <Navbar />
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
