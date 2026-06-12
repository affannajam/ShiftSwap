import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FluidShader = () => {
  const materialRef = useRef();

  // The math for the fluid animation
  const uniforms = useMemo(() => ({
    u_time: { value: 0.0 }
  }), []);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv * 3.0; // Scale the fluid pattern
      
      // Moving waves math
      float wave1 = sin(uv.x + u_time * 0.5) * cos(uv.y + u_time * 0.3);
      float wave2 = sin(uv.y * 2.0 - u_time * 0.2) * cos(uv.x * 1.5 + u_time * 0.4);
      float fluid = (wave1 + wave2) * 0.5 + 0.5;

      // Color palette (Dark background with Orange/Red highlights)
      vec3 darkBg = vec3(0.04, 0.04, 0.05);
      vec3 orangeGlow = vec3(1.0, 0.27, 0.0);
      vec3 redGlow = vec3(0.86, 0.08, 0.24);

      vec3 finalColor = mix(darkBg, mix(orangeGlow, redGlow, wave1), fluid * 0.3);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Update the time uniform every frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      {/* A massive plane to cover the whole screen */}
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default function FluidBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <FluidShader />
      </Canvas>
    </div>
  );
}