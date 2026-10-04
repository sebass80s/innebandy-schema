import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innebandy Schema",
  description: "Rättvis rotation av spelare och tränare över en säsong.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
