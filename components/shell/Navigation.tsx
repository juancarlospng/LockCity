'use client';
import { useRef, useState } from 'react';
const links = [{ href: '#enter-city', label: 'Enter the city', index: '01' }, { href: '#latest-drop', label: 'Latest drop', index: '02' }];
export function Navigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className="site-header" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
  }}>
    <a className="wordmark" href="#enter-city" aria-label="Lock City home"><span aria-hidden="true" />LOCK CITY</a>
    <nav className="desktop-nav" aria-label="Primary">{links.map(link => <a key={link.href} href={link.href}><span className="nav-index">{link.index}</span>{link.label}</a>)}</nav>
    <button ref={toggle} type="button" className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>Menu <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <nav id="mobile-navigation" className="mobile-nav" data-open={open} aria-label="Mobile">{links.map(link => <a key={link.href} href={link.href} onClick={() => { setOpen(false); document.querySelector<HTMLElement>(link.href)?.focus({ preventScroll: true }); }}>{link.label}<span aria-hidden="true">↗</span></a>)}</nav>
  </header>;
}
