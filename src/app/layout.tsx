import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const yekanBakh = localFont({
  src: [
    {
      path: "./fonts/YekanBakh-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-Black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/YekanBakh-ExtraBlack.woff2",
      weight: "950",
      style: "normal",
    },
  ],
  variable: "--font-yekan-bakh",
});

export const metadata: Metadata = {
  title: "Aoyume Player",
  description: "Standalone online player for Aoyume.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`dark ${yekanBakh.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
