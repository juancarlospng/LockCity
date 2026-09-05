import type { Metadata } from 'next';
import { Navigation } from '@/components/shell/Navigation';
import { Footer } from '@/components/shell/Footer';
import './globals.css';
export const metadata: Metadata = {
  title: 'LOCK CITY — Enter the City',
  description: 'LOCK CITY V2. An editorial streetwear experience. Development prototype with demo content.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><Navigation /><main id="main" tabIndex={-1}>{children}</main><Footer /></body></html>;
}
