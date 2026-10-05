"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { seededRandom } from "@/lib/utils";
import { SceneCanvas, useQuality, useReducedMotionPref } from "./SceneCanvas";

export const CITY_CAMERA_START = [0, 1.7, 10] as const;
export const CITY_CAMERA_MID = [0.18, 1.64, 7.15] as const;
export const CITY_CAMERA_END = [0.36, 1.55, 5.05] as const;
export const CITY_CAMERA_MID_MOBILE = [0.12, 1.64, 7.7] as const;
export const CITY_CAMERA_END_MOBILE = [0.22, 1.58, 5.85] as const;
export const CITY_CAMERA_TARGET_START = [0, 1.5, 0] as const;
export const CITY_CAMERA_TARGET_END = [0, 1.5, -4] as const;

function smoothstep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function cityTravel(progress: number) {
  if (progress <= 0.12) return smoothstep(progress / 0.12) * 0.02;
  if (progress <= 0.2) return 0.02 + smoothstep((progress - 0.12) / 0.08) * 0.08;
  if (progress <= 0.68) return 0.1 + smoothstep((progress - 0.2) / 0.48) * 0.8;
  if (progress <= 0.82) return 0.9 + smoothstep((progress - 0.68) / 0.14) * 0.1;
  return 1;
}

function CameraRig({ progress }: { progress?: MotionValue<number> }) {
  const { camera, pointer, size } = useThree();
  useFrame(() => {
    const p = progress?.get() ?? 0;
    const travel = cityTravel(p);
    const firstLeg = Math.min(travel / 0.58, 1);
    const secondLeg = Math.max((travel - 0.58) / 0.42, 0);
    const mid = size.width < 768 ? CITY_CAMERA_MID_MOBILE : CITY_CAMERA_MID;
    const end = size.width < 768 ? CITY_CAMERA_END_MOBILE : CITY_CAMERA_END;
    const pathX = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(CITY_CAMERA_START[0], mid[0], firstLeg),
      end[0],
      secondLeg,
    );
    const pathY = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(CITY_CAMERA_START[1], mid[1], firstLeg),
      end[1],
      secondLeg,
    );
    const pathZ = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(CITY_CAMERA_START[2], mid[2], firstLeg),
      end[2],
      secondLeg,
    );
    const pointerStrength = 1 - travel * 0.45;
    const targetX = pathX + pointer.x * 0.55 * pointerStrength;
    const targetY = pathY + pointer.y * 0.24 * pointerStrength;
    camera.position.x += (targetX - camera.position.x) * 0.08;
    camera.position.y += (targetY - camera.position.y) * 0.08;
    camera.position.z += (pathZ - camera.position.z) * 0.12;
    camera.lookAt(
      THREE.MathUtils.lerp(CITY_CAMERA_TARGET_START[0], CITY_CAMERA_TARGET_END[0], travel),
      THREE.MathUtils.lerp(CITY_CAMERA_TARGET_START[1], CITY_CAMERA_TARGET_END[1], travel),
      THREE.MathUtils.lerp(CITY_CAMERA_TARGET_START[2], CITY_CAMERA_TARGET_END[2], travel),
    );
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
      camera={{ position: [...CITY_CAMERA_START], fov: 42 }}
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
