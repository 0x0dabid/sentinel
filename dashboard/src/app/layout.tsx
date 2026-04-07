import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTINEL — Smart Money Narrative Oracle",
  description: "Autonomous multi-chain alpha pipeline powered by Nansen CLI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased grid-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
