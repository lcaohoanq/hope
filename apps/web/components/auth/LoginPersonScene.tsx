"use client";

import {
  Clone,
  ContactShadows,
  OrbitControls,
  useAnimations,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { LoopRepeat, RepeatWrapping, SRGBColorSpace } from "three";

const MODEL_PATH = "/models/login-person.glb";
const SHIBA_MODEL_PATH = "/models/Shiba-Inu.glb";
const TREE_MODEL_PATH = "/models/Tree.glb";
const ROCKY_TERRAIN_PATH = "/grounds/rocky_terrain_02_1k/textures";
const PEBBLE_GROUND_PATH = "/grounds/pebble_ground_01_1k/textures";
const INITIAL_CAMERA_POSITION: [number, number, number] = [-5, 5, 8.7];
const INITIAL_CAMERA_TARGET: [number, number, number] = [0.1, 0.75, 0];

function LoginPersonModel() {
  const groupRef = useRef<Group>(null);
  const { animations, scene } = useGLTF(MODEL_PATH);
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    const walkName =
      names.find((name) => name.endsWith("Man_Walk")) ??
      names.find((name) => name.toLowerCase().includes("walk")) ??
      names[0];
    const walkAction = walkName ? actions[walkName] : undefined;

    if (!walkAction) {
      return;
    }

    walkAction.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.35).play();

    return () => {
      walkAction.fadeOut(0.25);
    };
  }, [actions, names]);

  return (
    <group ref={groupRef} position={[0, -1.0, 0]} rotation={[0, -0.22, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

function ShibaInuModel() {
  const groupRef = useRef<Group>(null);
  const { animations, scene } = useGLTF(SHIBA_MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const walkAction = actions.Walk;

    if (!walkAction) {
      return;
    }

    walkAction.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.35).play();

    return () => {
      walkAction.fadeOut(0.25);
    };
  }, [actions]);

  return (
    <group ref={groupRef} position={[0.55, -1.0, 0.78]} rotation={[0, -0.12, 0]} scale={0.45}>
      <primitive object={scene} />
    </group>
  );
}

function TreeModel() {
  const { scene } = useGLTF(TREE_MODEL_PATH);
  const trees = [
    { position: [-2.75, -0.9, 0.5], rotation: 0.28, scale: 0.68 },
    { position: [2.9, -0.9, 0.2], rotation: -0.42, scale: 0.64 },
    { position: [-4.0, -0.9, -1.75], rotation: -0.18, scale: 0.56 },
    { position: [4.05, -0.9, -2.05], rotation: 0.2, scale: 0.54 },
  ] satisfies Array<{
    position: [number, number, number];
    rotation: number;
    scale: number;
  }>;

  return (
    <group>
      {trees.map((tree) => (
        <Clone
          key={tree.position.join("-")}
          object={scene}
          position={tree.position}
          rotation={[0, tree.rotation, 0]}
          scale={tree.scale}
        />
      ))}
    </group>
  );
}

type GroundStripProps = {
  paths: {
    color: string;
    normal: string;
    roughness: string;
  };
  position: [number, number, number];
  repeat: [number, number];
  size: [number, number];
};

function GroundStrip({ paths, position, repeat, size }: GroundStripProps) {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    paths.color,
    paths.normal,
    paths.roughness,
  ]);

  const groundMaps = useMemo(() => {
    const configuredColorMap = colorMap.clone();
    const configuredNormalMap = normalMap.clone();
    const configuredRoughnessMap = roughnessMap.clone();

    configuredColorMap.colorSpace = SRGBColorSpace;

    [configuredColorMap, configuredNormalMap, configuredRoughnessMap].forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeat[0], repeat[1]);
      texture.needsUpdate = true;
    });

    return {
      colorMap: configuredColorMap,
      normalMap: configuredNormalMap,
      roughnessMap: configuredRoughnessMap,
    };
  }, [colorMap, normalMap, repeat, roughnessMap]);

  useEffect(() => {
    return () => {
      groundMaps.colorMap.dispose();
      groundMaps.normalMap.dispose();
      groundMaps.roughnessMap.dispose();
    };
  }, [groundMaps]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        map={groundMaps.colorMap}
        normalMap={groundMaps.normalMap}
        roughness={0.92}
        roughnessMap={groundMaps.roughnessMap}
      />
    </mesh>
  );
}

function LoginGround() {
  const rockyTerrain = {
    color: `${ROCKY_TERRAIN_PATH}/rocky_terrain_02_diff_1k.png`,
    normal: `${ROCKY_TERRAIN_PATH}/rocky_terrain_02_nor_gl_1k.png`,
    roughness: `${ROCKY_TERRAIN_PATH}/rocky_terrain_02_rough_1k.png`,
  };
  const pebbleGround = {
    color: `${PEBBLE_GROUND_PATH}/pebble_ground_01_diff_1k.png`,
    normal: `${PEBBLE_GROUND_PATH}/pebble_ground_01_nor_gl_1k.png`,
    roughness: `${PEBBLE_GROUND_PATH}/pebble_ground_01_rough_1k.png`,
  };

  return (
    <group position={[0, -0.98, 0.35]}>
      <GroundStrip
        paths={pebbleGround}
        position={[0, 0, 0]}
        repeat={[0.75, 4.8]}
        size={[2.15, 10]}
      />
      <GroundStrip
        paths={rockyTerrain}
        position={[-3.05, -0.01, 0]}
        repeat={[1.15, 4.2]}
        size={[3.95, 10]}
      />
      <GroundStrip
        paths={rockyTerrain}
        position={[3.05, -0.01, 0]}
        repeat={[1.15, 4.2]}
        size={[3.95, 10]}
      />
    </group>
  );
}

export function LoginPersonScene() {
  return (
    <Canvas
      camera={{ fov: 38, position: INITIAL_CAMERA_POSITION }}
      className="h-full w-full"
      dpr={[1, 1.8]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1.55} />
      <directionalLight intensity={2.25} position={[3.2, 4.8, 3.6]} />
      <directionalLight intensity={0.75} position={[-3.5, 2.2, -2.4]} />
      <Suspense fallback={null}>
        <LoginGround />
        <TreeModel />
        <LoginPersonModel />
        <ShibaInuModel />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={11}
          maxPolarAngle={Math.PI / 1.75}
          minDistance={5.8}
          minPolarAngle={Math.PI / 4.5}
          target={INITIAL_CAMERA_TARGET}
        />
        <ContactShadows blur={2.8} far={4} opacity={0.24} position={[0, -0.92, 0]} scale={5} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_PATH);
useGLTF.preload(SHIBA_MODEL_PATH);
useGLTF.preload(TREE_MODEL_PATH);
