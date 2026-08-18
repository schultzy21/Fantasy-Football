import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baruka Ta Adenine League Hub",
  description: "Weekly league newspaper for the Baruka Ta Adenine Sleeper league.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
