import type { Metadata } from "next";
import "./globals.css";
import MainNav from "./components/MainNav";

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
      <body>
        <MainNav />
        {children}
      </body>
    </html>
  );
}