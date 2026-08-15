import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mutual NDA Creator — prelegal",
  description:
    "Fill in a cover page and generate a Common Paper Mutual Non-Disclosure Agreement ready to print or save as PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
