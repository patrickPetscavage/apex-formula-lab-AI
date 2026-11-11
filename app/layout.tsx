import type { Metadata } from "next";
import "./globals.css";
import "./research.css";
import "./atlas.css";

export const metadata: Metadata = {
  title: "APEX / Formula Lab",
  description: "Explore a 3D formula car, tune components, and compare simulated laps in an independent engineering sandbox.",
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
