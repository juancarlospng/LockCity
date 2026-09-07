import type { Metadata, Viewport } from "next";
import { Anton, Space_Mono } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from "sonner";
import { CartProvider } from "@/lib/cart";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Cursor } from "@/components/Cursor";
import { AnalyticsRouteTracker } from "@/components/AnalyticsRouteTracker";
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
  title: "LOCK CITY® — THE CITY IS ALIVE",
  description:
    "Lock City. A streetwear system rendered as a place. Collections are districts. Products are objects. Locked in.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

// GTM loads only when configured. Consent defaults are queued onto the
// dataLayer before GTM starts processing; update them from a consent UI
// when one exists.
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
const consentDefault = JSON.stringify([
  "consent",
  "default",
  {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  },
]);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      {gtmId ? (
        <>
          <Script id="lc-consent-defaults" strategy="beforeInteractive">
            {`window.dataLayer = window.dataLayer || []; window.dataLayer.push(${consentDefault});`}
          </Script>
          <GoogleTagManager gtmId={gtmId} />
        </>
      ) : null}
      <body className="grain bg-bg text-bone antialiased">
        <CartProvider>
          <SmoothScroll />
          {gtmId ? (
            <Suspense fallback={null}>
              <AnalyticsRouteTracker />
            </Suspense>
          ) : null}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-bone focus:px-4 focus:py-2 focus:text-xs focus:uppercase focus:tracking-[0.2em] focus:text-bg"
          >
            Skip to content
          </a>
          <Navigation />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <Cursor />
          <Toaster
            theme="dark"
            position="bottom-left"
            toastOptions={{
              style: {
                background: "#101010",
                border: "1px solid #222222",
                color: "#F1EFE9",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontSize: "11px",
              },
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}
