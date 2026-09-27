import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homely | Find your home’s helping hand",
  description: "Book home repair specialists, post a project, and manage your work. Available in English and Spanish for the US and Colombia.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
