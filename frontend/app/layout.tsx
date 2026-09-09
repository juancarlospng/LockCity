import type { Metadata, Viewport } from "next";
import { Anton, Space_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import "./globals.css";
const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});
export const metadata: Metadata = {
  title: "Lock City Clothes — The City Is Alive",
  description:
    "Premium clothing and streetwear. Explore the drops, people and culture of Lock City.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="grain bg-bg text-bone antialiased">
        <CartProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Navigation />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
