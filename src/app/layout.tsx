import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Trading Bot Dashboard",
  description: "Panel de control para el bot de trading con inteligencia artificial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
