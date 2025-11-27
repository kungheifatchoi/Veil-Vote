import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veil Vote - Vote Behind the Veil",
  description: "An encrypted on-chain voting application based on Fully Homomorphic Encryption (FHE). Your vote is sealed, results are verifiable.",
  keywords: ["FHE", "privacy", "voting", "blockchain", "Ethereum", "democracy", "encryption"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-inter antialiased bg-ink-black text-ivory min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
