/* 最小集成示例：在任意 Three.js 场景中使用奶蛙 / 公牛 / 小狗 + 换装 + 动画。
 * 依赖：three（npm i three）；资产目录 assets/ 与本文件同级（或用 setAssetBase 指定）。
 * 运行环境：浏览器（需要 WebGL 与 DecompressionStream）。
 */
import * as THREE from 'three';
import {
  loadCharacterAssets, bindAssets, buildRunner, buildBull, buildDog,
  applyOutfit, setAssetBase,
} from '../src/character';
import { animateRunner, animateQuadruped } from '../src/animator';

export async function mountNaiwaCharacters(canvas: HTMLCanvasElement) {
  /* 1. 基础 Three.js 场景（复用你自己的场景即可） */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fdf6e3');
  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 200);
  camera.position.set(0, 3, 9);
  camera.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c8b48a', 1.1));
  const sun = new THREE.DirectionalLight('#fff4d6', 2.2);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.MeshStandardMaterial({ color: '#e8d9b0' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* 2. 加载角色资产（manifest + 三角色网格 + 9 张 PBR 贴图，约 10MB）
   *    若资产不在站点根 /assets 下，先调用：setAssetBase('/your/path/assets') */
  setAssetBase('/assets');
  const assets = await loadCharacterAssets((p, status) => console.log(`${(p * 100) | 0}% ${status}`));
  bindAssets(assets);   // 供换装系统读取 manifest

  /* 3. 构建角色（奶蛙 / 公牛 / 小狗） */
  const runner = buildRunner(assets);
  const bull = buildBull(assets);
  const dog = buildDog(assets);
  runner.root.position.set(0, 0, 0);
  bull.root.position.set(-3.2, 0, -1.5);
  bull.root.rotation.y = 0.5;
  dog.root.position.set(3.2, 0, -1.5);
  dog.root.rotation.y = -0.5;
  scene.add(runner.root, bull.root, dog.root);

  /* 4. 换装（可选；72 套服装 id 见 outfit-catalog.ts，'classic' 为裸装） */
  await applyOutfit(runner, 'suit');        // 午夜绅士 · 西装
  // await applyOutfit(runner, 'lolita');   // 紫糖茶会 · Lolita
  // await applyOutfit(runner, 'classic');  // 脱掉

  /* 5. 渲染循环 + 程序化骨骼动画 */
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;
    /* 奶蛙原地奔跑（mode: idle/run/jump/slide；speedNorm 0~1；jumps 决定跳跃风格） */
    animateRunner(runner, { mode: 'run', active: true, speedNorm: 1, turnLean: 0, preview: false, time: t, dt, jumps: 0 });
    /* 公牛 / 小狗四足追击步态 */
    animateQuadruped(bull, { mode: 'run', active: true, speedNorm: 1, turnLean: 0, preview: false, time: t, dt }, 'bull');
    animateQuadruped(dog, { mode: 'run', active: true, speedNorm: 1, turnLean: 0, preview: false, time: t, dt }, 'dog');
    runner.root.rotation.y = Math.sin(t * 0.4) * 0.3;
    renderer.render(scene, camera);
  });

  return { scene, runner, bull, dog, applyOutfit: (id: string) => applyOutfit(runner, id) };
}
