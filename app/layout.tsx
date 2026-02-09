import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MARLON - Plateforme de Leasing Médical",
  description: "Plateforme de leasing de matériel médical",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
