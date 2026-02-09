import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MARLON Back-Office - Administration",
  description: "Administration de la plateforme MARLON",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-white">{children}</body>
    </html>
  );
}
