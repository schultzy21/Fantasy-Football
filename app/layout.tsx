import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import FieldScene from "@/components/FieldScene";
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
  title: "2026 Nations Fantasy Football League Hub",
  description: "League hub for the 2026 Nations Fantasy Football League.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelDisplay.variable} ${pixelBody.variable}`}>
      <body>
        <FieldScene />
        {children}
      </body>
    </html>
  );
}
