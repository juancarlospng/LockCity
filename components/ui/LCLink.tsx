import type { ReactNode } from 'react';
export function LCLink({ href, children, light = false }: { href: string; children: ReactNode; light?: boolean }) {
  return <a className={`lc-link${light ? ' light' : ''}`} href={href}>{children}<span className="arrow" aria-hidden="true">↗</span></a>;
}
