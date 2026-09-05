"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { seededRandom } from "@/lib/utils";
import { SceneCanvas, useQuality, useReducedMotionPref } from "./SceneCanvas";

function CameraRig({ progress }: { progress?: MotionValue<number> }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    const p = progress?.get() ?? 0;
    const targetX = pointer.x * 0.7;
    const targetY = 1.7 + pointer.y * 0.35;
    camera.position.x += (targetX - camera.position.x) * 0.045;
    camera.position.y += (targetY - camera.position.y) * 0.045;
    camera.position.z += (10 - p * 5 - camera.position.z) * 0.07;
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}

function Buildings({ density }: { density: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const rand = seededRandom(2007);
    const list: { x: number; z: number; h: number; w: number }[] = [];
    for (let x = -16; x <= 16; x += 2.4) {
      for (let z = -26; z <= 4; z += 2.4) {
        if (Math.abs(x) < 2.2) continue; // central avenue
        if (rand() > density) continue;
        const h = 0.6 + Math.pow(rand(), 2.2) * 7;
        list.push({ x: x + (rand() - 0.5) * 0.8, z, h, w: 1.2 + rand() * 0.9 });
      }
    }
    return list;
  }, [density]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    items.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.w);
      m.setPosition(b.x, b.h / 2 - 0.4, b.z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} key={items.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#202020" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

function Monoliths() {
  const towers = useMemo(
    () => [
      { x: -3.4, z: -10, h: 7.5, w: 1.6 },
      { x: 3.6, z: -12, h: 9, w: 2 },
      { x: -5.8, z: -16, h: 11, w: 2.4 },
      { x: 6.2, z: -18, h: 8, w: 1.8 },
      { x: 0.4, z: -22, h: 13, w: 3 },
    ],
    []
  );
  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2 - 0.4, t.z]}>
          <boxGeometry args={[t.w, t.h, t.w]} />
          <meshStandardMaterial
            color="#2A2A2A"
            roughness={0.75}
            metalness={0.2}
            emissive="#F1EFE9"
            emissiveIntensity={0.03}
          />
          <Edges scale={1.001} color="#565656" threshold={20} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = seededRandom(99);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 30;
      arr[i * 3 + 1] = rand() * 9 - 0.4;
      arr[i * 3 + 2] = (rand() - 0.5) * 30 - 8;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current)
      ref.current.rotation.y = state.clock.elapsedTime * 0.008;
  });

  return (
    <points ref={ref} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#9A9A9A"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function HeroScene({ progress }: { progress?: MotionValue<number> }) {
  const quality = useQuality();
  const reduced = useReducedMotionPref();
  const particleCount = quality === "high" ? 900 : quality === "medium" ? 500 : 220;
  const density = quality === "low" ? 0.55 : 0.75;

  return (
    <SceneCanvas
      label="Abstract architectural visualization of Lock City — brutalist monoliths in fog"
      className="absolute inset-0 h-full w-full"
      camera={{ position: [0, 1.7, 10], fov: 42 }}
    >
      <fog attach="fog" args={["#050505", 8, 36]} />
      <ambientLight intensity={0.38} />
      <directionalLight position={[6, 10, 4]} intensity={1.35} color="#F1EFE9" />
      <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#9A9A9A" />
      <spotLight position={[0, 9, 6]} angle={0.5} penumbra={0.8} intensity={1.2} color="#F1EFE9" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#080808" roughness={1} />
      </mesh>
      <Buildings density={density} />
      <Monoliths />
      <Dust count={particleCount} />
      {!reduced && <CameraRig progress={progress} />}
    </SceneCanvas>
  );
}
