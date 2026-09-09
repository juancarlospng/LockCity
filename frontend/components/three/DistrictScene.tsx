"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SceneCanvas, useReducedMotionPref } from "./SceneCanvas";

const DISTRICT_X = [-4.8, -1.6, 1.6, 4.8];

interface DistrictSceneProps {
  active: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}

function DistrictBlock({
  index,
  active,
  onHover,
  onSelect,
}: {
  index: number;
  active: boolean;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  const blocks = useMemo(() => {
    // Each district gets a distinct architectural silhouette
    const shapes = [
      [
        { x: 0, h: 2.6, w: 1.2 },
        { x: 0.7, h: 1.4, w: 0.7 },
        { x: -0.7, h: 1.8, w: 0.6 },
      ],
      [
        { x: 0, h: 3.4, w: 0.9 },
        { x: 0.6, h: 2.1, w: 0.8 },
        { x: -0.6, h: 1.2, w: 0.9 },
      ],
      [
        { x: 0, h: 1.8, w: 1.5 },
        { x: 0.2, h: 3, w: 0.6 },
        { x: -0.7, h: 1, w: 0.6 },
      ],
      [
        { x: 0, h: 2.2, w: 1.4 },
        { x: 0, h: 3.2, w: 0.5 },
        { x: 0.8, h: 1.5, w: 0.5 },
      ],
    ];
    return shapes[index % shapes.length];
  }, [index]);

  useFrame((_, dt) => {
    if (!group.current || !mat.current) return;
    const targetScale = active ? 1.08 : 1;
    const targetGlow = active ? 0.35 : 0.02;
    const scale = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      6,
      Math.min(dt, 0.1),
    );
    group.current.scale.setScalar(scale);
    mat.current.emissiveIntensity +=
      (targetGlow - mat.current.emissiveIntensity) * Math.min(dt * 6, 1);
  });

  return (
    <group
      ref={group}
      position={[DISTRICT_X[index], 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
      }}
    >
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, 0]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            ref={i === 0 ? mat : undefined}
            color="#242424"
            roughness={0.8}
            emissive="#F1EFE9"
            emissiveIntensity={0.02}
          />
          <Edges
            scale={1.002}
            color={active ? "#747474" : "#2C2C2C"}
            threshold={20}
          />
        </mesh>
      ))}
    </group>
  );
}

function DistrictCamera({ active }: { active: number | null }) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    const targetX = active === null ? 0 : DISTRICT_X[active] * 0.28;
    const targetZ = active === null ? 9.5 : 8;
    const factor = 1 - Math.exp(-3 * Math.min(delta, 0.1));
    camera.position.x += (targetX - camera.position.x) * factor;
    camera.position.z += (targetZ - camera.position.z) * factor;
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

export function DistrictScene({
  active,
  onHover,
  onSelect,
}: DistrictSceneProps) {
  const reduced = useReducedMotionPref();
  return (
    <SceneCanvas
      label="Abstract spatial diagram of the four Lock City districts"
      className="absolute inset-0 h-full w-full"
      camera={{ position: [0, 2.4, 9.5], fov: 40 }}
    >
      <fog attach="fog" args={["#050505", 10, 26]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 9, 5]} intensity={1.1} color="#F1EFE9" />
      <gridHelper args={[26, 26, "#2A2A2A", "#161616"]} position={[0, 0, 0]} />
      {[0, 1, 2, 3].map((i) => (
        <DistrictBlock
          key={i}
          index={i}
          active={active === i}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {!reduced && <DistrictCamera active={active} />}
    </SceneCanvas>
  );
}
