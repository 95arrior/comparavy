"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

/** 입 벌린 구(phi gap) = 3D 팩맨. 크롬 금속 + 천천히 회전 + 등장 시 살짝 확대. */
function Pacman() {
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const MOUTH = 1.3; // 입 벌어진 각도(rad) — 크게
  useFrame((state) => {
    if (!ref.current) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    // 극축을 카메라 쪽으로 기울여 쐐기(입)가 파이 조각처럼 정면에 보이게 + 잔잔한 흔들림
    ref.current.rotation.x = -1.12 + Math.sin(t * 0.5) * 0.06;
    ref.current.rotation.z = -0.35 + Math.sin(t * 0.45) * 0.1;
    const s = 0.72 + Math.min(1, t / 1.1) * 0.28; // 0.72 → 1 등장 확대
    ref.current.scale.setScalar(s);
  });
  return (
    <group ref={ref} rotation={[-1.12, 0, -0.35]}>
      <mesh>
        {/* phiStart, phiLength로 우측에 쐐기(입)를 뚫는다 */}
        <sphereGeometry args={[1.6, 160, 160, MOUTH / 2, Math.PI * 2 - MOUTH]} />
        <meshStandardMaterial color="#e2e6ee" metalness={1} roughness={0.12} side={THREE.DoubleSide} envMapIntensity={1.7} />
      </mesh>
    </group>
  );
}

export default function PacmanIntro3D() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 3400);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeInOut" }} className="fixed inset-0 z-[100] bg-[#050609]">
          {/* 은은한 광원(블러) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a2542]/70 blur-[130px]" />
          <Canvas camera={{ position: [0, 0, 4.6], fov: 44 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
            <ambientLight intensity={0.28} />
            <spotLight position={[5, 6, 5]} intensity={3} angle={0.5} penumbra={1} color="#eaf1ff" />
            <pointLight position={[-6, -2, 4]} intensity={1.6} color="#6a8bff" />
            {/* 림라이트 — 뒤에서 실루엣 외곽을 살림 */}
            <directionalLight position={[-3, 3, -5]} intensity={3.2} color="#cfe0ff" />
            <Pacman />
            {/* 외부 HDR 없이 라이트포머로 크롬 반사 환경 구성(밝은 스튜디오) */}
            <Environment resolution={256}>
              <Lightformer intensity={4} form="rect" position={[0, 3.5, 4]} scale={[9, 7, 1]} color="#ffffff" />
              <Lightformer intensity={2.2} form="rect" position={[-5, 1, 2]} scale={[5, 6, 1]} color="#8ab0ff" />
              <Lightformer intensity={1.8} form="rect" position={[5, -1, 1]} scale={[5, 6, 1]} color="#c07bff" />
              <Lightformer intensity={1.4} form="circle" position={[0, -4, 3]} scale={[6, 6, 1]} color="#3ad6ff" />
            </Environment>
          </Canvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
