'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';

export function CameraRig() {
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const hero = document.getElementById('enter-city');
    if (!hero) return;
    const move = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      target.current.x = MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1) * 0.22;
      target.current.y = MathUtils.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1) * 0.1;
    };
    const reset = () => { target.current = { x: 0, y: 0 }; };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', reset);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', reset); };
  }, []);
  useFrame(({ camera }, delta) => {
    camera.position.x = MathUtils.damp(camera.position.x, target.current.x, 3, Math.min(delta, .1));
    camera.position.y = MathUtils.damp(camera.position.y, target.current.y, 3, Math.min(delta, .1));
    camera.lookAt(0, 0, 0);
  });
  return null;
}
