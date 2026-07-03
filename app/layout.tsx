import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "KIPROD Credit Risk Command Centre",
  description:
    "Board-ready credit risk visibility, early warning monitoring, and management action tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <MainNav />
        {children}
      </body>
    </html>
  );
}