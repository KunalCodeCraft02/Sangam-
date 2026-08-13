import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sangam — Travel India, Together",
  description:
    "Real-time group travel coordination for India. Split costs, track prices, and find the perfect meeting point — without the friction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-sand-100 text-forest-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
