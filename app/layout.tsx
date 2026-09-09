import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelDisplay = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const pixelBody = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baruka Ta Adenine League Hub",
  description: "Weekly league newspaper for the Baruka Ta Adenine Sleeper league.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelDisplay.variable} ${pixelBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
