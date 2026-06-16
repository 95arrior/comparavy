"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

/** 입 벌린 구(phi gap) = 3D 팩맨. 크롬 금속 + 천천히 회전 + 등장 시 살짝 확대. */
function Pacman() {
  const ref = useRef<THREE.Mesh>(null);
  const t0 = useRef<number | null>(null);
  // 2D 팩맨(입 오른쪽) → 압출 + 베벨로 입체 코인. 베벨 가장자리에 크롬 하이라이트가 걸림.
  const geom = useMemo(() => {
    const r = 1.5, mouth = 0.5; // mouth = 입 반각(rad)
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(r * Math.cos(mouth), r * Math.sin(mouth)); // 윗입술
    s.absarc(0, 0, r, mouth, Math.PI * 2 - mouth, false); // 몸통 호
    s.lineTo(0, 0); // 아랫입술→중심
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.28, bevelSegments: 18, curveSegments: 160 });
    g.center();
    return g;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    // 정면(카메라)을 보며 잔잔히 흔들림 — 입은 오른쪽 고정
    ref.current.rotation.y = -0.15 + Math.sin(t * 0.5) * 0.12;
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.06;
    const sc = 0.8 + Math.min(1, t / 1.1) * 0.2;
    ref.current.scale.setScalar(sc);
  });
  return (
    <mesh ref={ref} geometry={geom}>
      <meshStandardMaterial color="#cbd0da" metalness={1} roughness={0.08} envMapIntensity={1.5} />
    </mesh>
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
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeInOut" }} className="fixed inset-0 z-[100] bg-black">
          <Canvas camera={{ position: [0, 0, 4.4], fov: 44 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
            <ambientLight intensity={0.1} />
            {/* 좌상단 강한 흰 키라이트(레퍼런스의 밝은 하이라이트) */}
            <directionalLight position={[-4, 5, 4]} intensity={4.5} color="#ffffff" />
            {/* 우하단 미세 림 */}
            <directionalLight position={[4, -3, -3]} intensity={1.6} color="#aeb6c4" />
            <Pacman />
            {/* 모노크롬 폴리시드 크롬 — 밝은 흰 띠 + 어두운 채움 */}
            <Environment resolution={256}>
              <Lightformer intensity={6} form="rect" position={[-2, 4, 3]} scale={[7, 2.5, 1]} color="#ffffff" />
              <Lightformer intensity={2.2} form="rect" position={[4, 1, 2]} scale={[1.6, 8, 1]} color="#cfd5e0" />
              <Lightformer intensity={1.2} form="rect" position={[-4, -2, 2]} scale={[6, 6, 1]} color="#1b2233" />
              <Lightformer intensity={0.6} form="circle" position={[0, -4, 2]} scale={[5, 5, 1]} color="#0a0d16" />
            </Environment>
          </Canvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
