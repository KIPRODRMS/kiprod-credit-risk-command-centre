import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";
import PageMotion from "./components/PageMotion";
import PwaInstall from "./components/PwaInstall";
import { getServerAccessContext } from "@/lib/accessServer";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "KIPROD Risk Command Centre",
    template: "%s | KIPROD Risk Command Centre",
  },
  description:
    "Board-ready credit risk visibility, early warning monitoring, and management action tracking.",
  applicationName: "KIPROD Risk Command Centre",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KIPROD Command",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071426",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await getServerAccessContext();
  return (
    <html lang="en">
      <body className={manrope.className}>
        <MainNav activeRole={access.activeRole} executiveCockpitAllowed={access.executiveCockpitAllowed} />
        <PageMotion>{children}</PageMotion>
        <PwaInstall />
      </body>
    </html>
  );
}
