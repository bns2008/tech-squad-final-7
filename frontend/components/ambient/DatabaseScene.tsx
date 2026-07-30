"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BoxGeometry, type Group } from "three";

function Network() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = Math.sin(Date.now() * 0.00025) * 0.06;
  });

  const nodes = [
    [-1.7, 0.75, 0], [0, 1.45, -0.25], [1.65, 0.7, 0.1],
    [-1.35, -0.8, 0.15], [0.1, -1.15, -0.2], [1.35, -0.7, 0.1],
  ] as const;

  return (
    <group ref={group}>
      {nodes.map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <icosahedronGeometry args={[0.11, 1]} />
          <meshBasicMaterial color={index % 2 ? "#82d8c5" : "#8aa7ff"} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]} rotation={[0.3, 0.5, 0.1]}>
        <boxGeometry args={[1.25, 1.25, 1.25]} />
        <meshBasicMaterial color="#2d3d68" wireframe transparent opacity={0.5} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new BoxGeometry(3.2, 2.2, 0.1)]} />
        <lineBasicMaterial color="#5f78c7" transparent opacity={0.18} />
      </lineSegments>
    </group>
  );
}

export default function DatabaseScene() {
  return (
    <div className="ambient-scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 6], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <Network />
      </Canvas>
    </div>
  );
}
