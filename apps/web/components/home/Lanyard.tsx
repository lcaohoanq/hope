/* eslint-disable react/no-unknown-property */
// @ts-nocheck -- meshline does not currently publish complete React Three Fiber types.
"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { LanyardFallback } from "@/components/home/LanyardFallback";

extend({ MeshLineGeometry, MeshLineMaterial });

const BLANK_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };
const CARD_MODEL = "/home/lanyard/card.glb";
const DEFAULT_LANYARD_TEXTURE = "/home/lanyard/lanyard.png";

type LanyardProps = {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: "cover" | "contain";
  lanyardImage?: string | null;
  lanyardWidth?: number;
  className?: string;
};

export function Lanyard({
  position = [0, 0, 18],
  gravity = [0, -40, 0],
  fov = 20,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
  className = "",
}: LanyardProps) {
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const markReady = useCallback(() => setIsReady(true), []);
  const markUnavailable = useCallback(() => setIsReady(false), []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  return (
    <div className={`relative h-full min-h-[460px] w-full ${className}`}>
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <CanvasLifecycle onContextLost={markUnavailable} onContextRestored={markReady} />
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            backImage={backImage}
            frontImage={frontImage}
            imageFit={imageFit}
            isMobile={isMobile}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
            onReady={markReady}
          />
        </Physics>
        <directionalLight intensity={3.5} position={[3, 4, 8]} />
        <directionalLight intensity={1.5} position={[-4, -2, 5]} />
      </Canvas>
      <LanyardFallback
        className={`absolute inset-0 z-10 transition-opacity duration-500 ${
          isReady ? "opacity-0" : "opacity-100"
        }`}
        image={frontImage}
      />
    </div>
  );
}

function CanvasLifecycle({ onContextLost, onContextRestored }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl, onContextLost, onContextRestored]);

  return null;
}

function Band({
  isMobile,
  frontImage,
  backImage,
  imageFit,
  lanyardImage,
  lanyardWidth,
  onReady,
}: Omit<LanyardProps, "position" | "gravity" | "fov" | "className"> & {
  isMobile: boolean;
  onReady: () => void;
}) {
  const band = useRef<THREE.Mesh<
    InstanceType<typeof MeshLineGeometry>,
    InstanceType<typeof MeshLineMaterial>
  > | null>(null);
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const hasReportedReady = useRef(false);
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const { nodes, materials } = useGLTF(CARD_MODEL);
  const texture = useTexture(lanyardImage || DEFAULT_LANYARD_TEXTURE);
  const frontTexture = useTexture(frontImage || BLANK_PIXEL);
  const backTexture = useTexture(backImage || BLANK_PIXEL);
  const [dragged, setDragged] = useState<false | THREE.Vector3>(false);
  const [hovered, setHovered] = useState(false);
  const reportReady = useCallback(() => {
    if (hasReportedReady.current) return;
    hasReportedReady.current = true;
    onReady();
  }, [onReady]);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  );

  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;
    if (!frontImage && !backImage) return baseMap;

    const canvas = document.createElement("canvas");
    const { width, height } = baseMap.image;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return baseMap;
    context.drawImage(baseMap.image, 0, 0, width, height);

    const drawFitted = (image, rect) => {
      const x = rect.x * width;
      const y = rect.y * height;
      const fittedWidth = rect.w * width;
      const fittedHeight = rect.h * height;
      const scale = (imageFit === "contain" ? Math.min : Math.max)(
        fittedWidth / image.width,
        fittedHeight / image.height,
      );
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      context.save();
      context.beginPath();
      context.rect(x, y, fittedWidth, fittedHeight);
      context.clip();
      context.drawImage(
        image,
        x + (fittedWidth - drawWidth) / 2,
        y + (fittedHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      context.restore();
    };

    if (frontImage && frontTexture.image) drawFitted(frontTexture.image, FRONT_UV_RECT);
    if (backImage && backTexture.image) drawFitted(backTexture.image, BACK_UV_RECT);
    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    return composite;
  }, [backImage, backTexture, frontImage, frontTexture, imageFit, materials.base.map]);

  useEffect(
    () => () => {
      if (cardMap !== materials.base.map) cardMap.dispose();
    },
    [cardMap, materials.base.map],
  );

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0],
  ]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [dragged, hovered]);

  useFrame((state, delta) => {
    if (dragged && typeof dragged !== "boolean") {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => {
        ref.current?.wakeUp();
      });
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (
      !band.current ||
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !j3.current ||
      !card.current
    ) {
      return;
    }

    const bodies = [fixed.current, j1.current, j2.current, j3.current, card.current];
    const translations = bodies.map((body) => body.translation());
    if (
      translations.some(
        (point) =>
          !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z),
      )
    ) {
      return;
    }

    [j1, j2].forEach((ref) => {
      if (
        !ref.current.lerped ||
        !Number.isFinite(ref.current.lerped.x) ||
        !Number.isFinite(ref.current.lerped.y) ||
        !Number.isFinite(ref.current.lerped.z)
      ) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
      }
      const distance = Math.max(
        0.1,
        Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())),
      );
      ref.current.lerped.lerp(ref.current.translation(), Math.min(1, delta * distance * 50));
    });
    curve.points[0].copy(j3.current.translation());
    curve.points[1].copy(j2.current.lerped);
    curve.points[2].copy(j1.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    const ropePoints = curve.getPoints(isMobile ? 16 : 32);
    if (
      ropePoints.some(
        (point) =>
          !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z),
      )
    ) {
      return;
    }
    // MeshLine 3.3 may resolve a second Three.js copy under pnpm, so Vector3
    // instances fail its instanceof check. A flat Float32Array avoids that path.
    band.current.geometry.setPoints(
      new Float32Array(ropePoints.flatMap((point) => [point.x, point.y, point.z])),
    );
    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
  });

  curve.curveType = "chordal";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const segmentProps = {
    angularDamping: 4,
    canSleep: true,
    colliders: false,
    linearDamping: 4,
  };
  return (
    <>
      <group position={[2.3, 3.8, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.15, -1, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.4, -2, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.65, -3, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[0.9, -4.5, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            position={[0, -1.2, -0.05]}
            scale={2.25}
            onPointerDown={(event) => {
              event.target.setPointerCapture(event.pointerId);
              setDragged(
                new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())),
              );
            }}
            onPointerOut={() => setHovered(false)}
            onPointerOver={() => setHovered(true)}
            onPointerUp={(event) => {
              event.target.releasePointerCapture(event.pointerId);
              setDragged(false);
            }}
          >
            <mesh geometry={nodes.card.geometry} onAfterRender={reportReady}>
              <meshPhysicalMaterial
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                map={cardMap}
                metalness={0.8}
                roughness={0.9}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
    </>
  );
}
