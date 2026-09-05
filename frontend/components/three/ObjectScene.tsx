"use client";

import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { SceneCanvas, useReducedMotionPref } from "./SceneCanvas";

function Artifact({ progress }: { progress?: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const p = progress?.get() ?? 0;
    if (group.current) {
      group.current.rotation.y =
        p * Math.PI * 2.2 + state.clock.elapsedTime * 0.04;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
    }
    if (ring.current) ring.current.rotation.z = state.clock.elapsedTime * 0.12;
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[1.35, 2, 1.35]} />
        <meshStandardMaterial color="#141414" roughness={0.82} metalness={0.12} />
        <Edges scale={1.002} color="#8A8A8A" threshold={20} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.7, 0.5, 1.7]} />
        <meshStandardMaterial color="#101010" roughness={0.9} />
        <Edges scale={1.002} color="#4A4A4A" threshold={20} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.012, 8, 96]} />
        <meshBasicMaterial color="#3A3A3A" />
      </mesh>
    </group>
  );
}

export function ObjectScene({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionPref();
  return (
    <SceneCanvas
      label="Rotating wireframe of featured object OBJECT_0041 — placeholder"
      className="absolute inset-0 h-full w-full"
      camera={{ position: [0, 0.7, 4.6], fov: 38 }}
    >
      <fog attach="fog" args={["#050505", 7, 16]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={1.3} color="#F1EFE9" />
      <gridHelper args={[16, 16, "#2A2A2A", "#141414"]} position={[0, -1.35, 0]} />
      <Artifact progress={reduced ? undefined : progress} />
    </SceneCanvas>
  );
}
