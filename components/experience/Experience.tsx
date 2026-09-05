'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DESKTOP_EXPERIENCE_QUERY, REDUCED_MOTION_QUERY } from '@/lib/experience';

const ExperienceCanvas = dynamic(() => import('./ExperienceCanvas'), { ssr: false, loading: () => null });
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Experience() {
  const host = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const onFailure = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const desktop = matchMedia(DESKTOP_EXPERIENCE_QUERY);
    const reduced = matchMedia(REDUCED_MOTION_QUERY);
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let inView = true;
    let supported: boolean | undefined;
    const update = () => {
      const allowed = desktop.matches && !reduced.matches && !connection?.saveData;
      if (allowed && supported === undefined) {
        try {
          const probe = document.createElement('canvas');
          const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
          supported = !!gl;
          gl?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch { supported = false; }
      }
      setEligible(allowed && supported === true);
      setActive(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }, { threshold: 0.01 });
    if (host.current) observer.observe(host.current);
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    const frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      desktop.removeEventListener('change', update); reduced.removeEventListener('change', update);
      connection?.removeEventListener('change', update); document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <>
    <div className="experience" ref={host} aria-hidden="true" data-mode={!eligible || failed || paused ? 'STATIC' : 'WEBGL'} data-active={active && !paused}>
      {eligible && !failed && !paused && <SceneBoundary onFailure={onFailure}><ExperienceCanvas active={active} onFailure={onFailure} /></SceneBoundary>}
    </div>
    {eligible && !failed && <button className="motion-toggle" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Enable motion +' : 'Pause motion −'}</button>}
  </>;
}
