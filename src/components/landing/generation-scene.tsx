"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Points } from "three";

const panels = [
  {
    position: [-2.65, 1.25, -0.3],
    rotation: [0.04, 0.55, -0.18],
    scale: [1.25, 1.65, 1],
  },
  {
    position: [2.7, 1.35, -0.7],
    rotation: [0.08, -0.58, 0.14],
    scale: [1.7, 1.05, 1],
  },
  {
    position: [-2.45, -1.55, -1],
    rotation: [-0.12, 0.52, 0.13],
    scale: [1.55, 0.95, 1],
  },
  {
    position: [2.45, -1.35, -0.15],
    rotation: [-0.08, -0.48, -0.12],
    scale: [1.15, 1.48, 1],
  },
] as const;

function Core() {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x +=
      (state.pointer.y * 0.09 - group.current.rotation.x) * 0.025;
    group.current.position.x +=
      (state.pointer.x * 0.22 - group.current.position.x) * 0.025;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.38, 5]} />
        <meshPhysicalMaterial
          color="#243b82"
          emissive="#0b1230"
          roughness={0.08}
          metalness={0.16}
          transmission={0.82}
          thickness={1.3}
          ior={1.3}
          clearcoat={1}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh rotation={[1.18, 0.24, 0.4]}>
        <torusGeometry args={[2.08, 0.018, 12, 150]} />
        <meshBasicMaterial color="#b6ff44" transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[0.35, 1.22, -0.2]}>
        <torusGeometry args={[2.44, 0.012, 12, 150]} />
        <meshBasicMaterial color="#7590ff" transparent opacity={0.48} />
      </mesh>
      {panels.map((panel, index) => (
        <group
          key={index}
          position={panel.position}
          rotation={panel.rotation}
          scale={panel.scale}
        >
          <mesh>
            <boxGeometry args={[1.15, 0.76, 0.035]} />
            <meshPhysicalMaterial
              color={index % 2 ? "#7ca536" : "#263c80"}
              emissive={index % 2 ? "#18250a" : "#080f2d"}
              roughness={0.25}
              metalness={0.45}
              clearcoat={0.9}
            />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[1.05, 0.66]} />
            <meshBasicMaterial
              color={index % 2 ? "#a8e953" : "#6d85ff"}
              transparent
              opacity={0.24}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ParticleField() {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(180 * 3);
    for (let index = 0; index < 180; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.7 + ((index * 37) % 100) / 52;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = (((index * 53) % 100) / 100 - 0.5) * 6.5;
      values[index * 3 + 2] = Math.sin(angle) * radius - 1.2;
    }
    return values;
  }, []);
  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y -= delta * 0.025;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b9c5ff" size={0.025} transparent opacity={0.55} />
    </points>
  );
}

export function GenerationScene() {
  return (
    <Canvas
      dpr={[1, 1.45]}
      camera={{ position: [0, 0.1, 8], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[4, 4, 5]} color="#dfe6ff" intensity={30} />
      <pointLight position={[-4, -1, 3]} color="#5d7dff" intensity={24} />
      <pointLight position={[2, -4, 2]} color="#b6ff44" intensity={15} />
      <ParticleField />
      <Core />
    </Canvas>
  );
}
