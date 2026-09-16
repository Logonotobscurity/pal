import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAL — Meaning-to-Action",
  description:
    "Speak naturally. PAL understands the meaning, builds the work, and asks before it acts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
