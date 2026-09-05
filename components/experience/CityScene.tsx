'use client';
// Declarative meshes are owned and disposed by R3F on unmount.
// A sparse steel colonnade gives the entry spatial depth without obscuring its DOM.
export function CityScene() {
  return <group position={[0, -.6, 0]}>
    {[0, 1, 2].map(index => <group key={`portal-${index}`} position={[0, -1, -index * 1.6]}>
      {[-1, 1].map(side => <mesh key={side} position={[side * 2.05, 0, 0]}>
        <boxGeometry args={[.065, 4.2, .22]} /><meshStandardMaterial color="#9aa092" metalness={.8} roughness={.35} transparent opacity={.24} />
      </mesh>)}
      <mesh position={[0, 2.1, 0]}><boxGeometry args={[4.16, .065, .22]} /><meshStandardMaterial color="#9aa092" metalness={.8} roughness={.35} transparent opacity={.24} /></mesh>
    </group>)}
    {[-1, 1].map(side => <group key={side}>{Array.from({ length: 6 }, (_, index) =>
      <mesh key={index} position={[side * (4.6 + index * .27), 0, -index * 1.25]}>
        <boxGeometry args={[.085, 8, .16]} /><meshStandardMaterial color="#969c92" metalness={.65} roughness={.42} transparent opacity={.3} />
      </mesh>)}</group>)}
    <ambientLight intensity={.7} />
    <directionalLight position={[0, 4, 4]} intensity={2.4} />
  </group>;
}
