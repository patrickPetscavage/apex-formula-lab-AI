import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX / Formula Lab",
  description: "Explore a 3D formula car, tune components, and compare simulated laps in an independent engineering sandbox.",
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
