'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { CameraRig } from './CameraRig';
import { CityScene } from './CityScene';
import { QUALITY_DPR, type Quality } from '@/lib/experience';

function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return null;
}
export default function ExperienceCanvas({ active, onFailure }: { active: boolean; onFailure: () => void }) {
  const [quality, setQuality] = useState<Quality>('MEDIUM');
  const lowSamples = useRef(0);
  return <Canvas camera={{ position: [0, 0, 8], fov: 48, near: .1, far: 40 }}
    dpr={QUALITY_DPR[quality]} frameloop={active ? 'always' : 'never'}
    gl={{ alpha: true, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }}
    fallback={null} style={{ pointerEvents: 'none' }}>
    <ContextGuard onFailure={onFailure} />
    <PerformanceMonitor bounds={() => [28, 55]} onIncline={() => { lowSamples.current = 0; setQuality('HIGH'); }}
      onDecline={() => {
        lowSamples.current += 1;
        if (lowSamples.current >= 3) onFailure();
        else setQuality(current => current === 'HIGH' ? 'MEDIUM' : 'LOW');
      }}>
      <CityScene /><CameraRig />
    </PerformanceMonitor>
  </Canvas>;
}
