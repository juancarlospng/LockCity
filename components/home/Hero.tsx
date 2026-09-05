import { LCLink } from '@/components/ui/LCLink';
import { Experience } from '@/components/experience/Experience';
export function Hero() {
  return <section className="hero" id="enter-city" aria-labelledby="hero-title" tabIndex={-1}>
    <picture className="hero-media"><source media="(max-width: 47.999rem)" srcSet="/assets/city-gate-mobile.webp" /><img src="/assets/city-gate.webp" alt="" width={1536} height={1024} fetchPriority="high" /></picture>
    <Experience />
    <div className="hero-content"><div className="hero-kicker"><p className="eyebrow">01 / Enter the city</p><p className="eyebrow">Streetwear / Culture / Community</p></div><h1 id="hero-title" className="hero-title">LOCK CITY</h1></div>
    <div className="hero-bottom"><p className="hero-entry"><span className="eyebrow">LOCK CITY V2</span>Enter the city.</p><div className="hero-action"><LCLink href="#latest-drop" light>Explore latest drop</LCLink></div><p className="hero-note eyebrow">Scroll to explore ↓<span>DEMO / CONCEPT VISUAL</span></p></div>
  </section>;
}
