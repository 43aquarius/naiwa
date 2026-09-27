# 奶蛙 · 公牛 · 小狗 —— 角色建模素材复用包

「奶蛙快跑」三角色（奶蛙 runner / 公牛 bull / 小狗 dog）的**官方蒙皮网格资产 + Three.js 加载与换装代码**，提取自 [43aquarius/naiwarunning](https://github.com/43aquarius/naiwarunning)，供任意 Three.js 项目直接复用。

- 奶蛙：2962 顶点 / 14970 索引 / 16 根骨骼蒙皮网格（SkinnedMesh）+ PBR 三张贴图
- 公牛 / 小狗：同规格蒙皮网格（复用同一 manifest/纹理管线）
- **72 套服装**独立蒙皮网格（复用奶蛙骨骼）+ `bodyCoverage` 逐顶点遮罩（穿装无穿模）

## 目录

```
src/
├── character.ts        # 核心：资产加载解码、材质构建、三角色构建、换装系统
├── animator.ts         # 程序化骨骼动画（跑步/跳跃/滑铲/待机 + 公牛小狗四足步态）
├── outfit-catalog.ts   # 73 套服装目录（id/名称/分类/价格，与原版商城一致）
└── art.ts              # 程序纹理系统（服装 pattern 纹样 + 场景材质，character.ts 依赖）
assets/
├── character-manifest.json  # 资产清单：网格字段偏移、材质、骨骼 rig、服装定义
├── characters.pack / .bin   # 三角色网格二进制（pack = gzip 压缩档，bin = 未压缩回退）
├── models/                  # 9 张 PBR 贴图（albedo/normal/metallicRoughness × 3 角色，webp）
└── outfits/                 # 72 套服装网格包（<id>.pack，gzip）
example/
└── usage.ts                 # 最小集成示例（Three.js 场景 + 加载 + 换装 + 动画）
```

## 快速开始

```bash
npm i three          # 唯一依赖
```

```ts
import * as THREE from 'three';
import {
  loadCharacterAssets, bindAssets, buildRunner, buildBull, buildDog,
  applyOutfit, setAssetBase,
} from './src/character';
import { animateRunner, animateQuadruped } from './src/animator';

// 0. 资产不在站点根 /assets 时指定托管路径
setAssetBase('/your-host/assets');

// 1. 加载（manifest + 网格 + 贴图，约 10MB；进度回调可选）
const assets = await loadCharacterAssets((p, s) => console.log(p, s));
bindAssets(assets);          // 供换装系统读取 manifest

// 2. 构建（返回 Actor：{ root, model, bones, outfit... }）
const runner = buildRunner(assets);   // 奶蛙
const bull   = buildBull(assets);     // 公牛
const dog    = buildDog(assets);      // 小狗
scene.add(runner.root, bull.root, dog.root);

// 3. 换装（可选）
await applyOutfit(runner, 'lolita');  // 72 套 id 见 outfit-catalog.ts；'classic' 脱装

// 4. 每帧动画
animateRunner(runner, { mode: 'run', active: true, speedNorm: 1, turnLean: 0, preview: false, time, dt, jumps });
animateQuadruped(bull, opts, 'bull');
animateQuadruped(dog, opts, 'dog');
```

完整可运行示例见 [`example/usage.ts`](./example/usage.ts)。

## API

### character.ts

| 导出 | 说明 |
|------|------|
| `setAssetBase(base)` | 资产根路径（默认 `/assets`） |
| `loadCharacterAssets(onProgress?)` | 加载+解码全部角色资产（模块级单例缓存），返回 `{ manifest, characters, materials }` |
| `bindAssets(assets)` | 绑定资产供换装系统使用（构建角色后调用一次） |
| `buildRunner / buildBull / buildDog(assets)` | 构建角色 Actor（含 SkinnedMesh + 骨骼 + 阴影深度材质） |
| `applyOutfit(actor, id)` | 异步换装（含 `classic` 脱装）；服装网格单例缓存 |
| `runnerSkin(actor)` | 取奶蛙皮肤蒙皮网格 |
| `outfitSurface` | 服装遮罩开关（0 裸装 / 1 丢弃被覆盖片元） |
| `makeCoveredDepthMaterial()` | 带遮罩的阴影深度材质（已自动装配） |

### animator.ts

| 导出 | 说明 |
|------|------|
| `animateRunner(actor, o)` | 奶蛙动画：`mode: idle/run/jump/slide`、`speedNorm 0~1`、`turnLean` 换道倾斜、`jumps % 3` 决定三种跳跃风格 |
| `animateQuadruped(actor, o, kind)` | 公牛 / 小狗四足步态 |

`AnimateOptions`：`{ mode, active, speedNorm, turnLean, preview, time, dt, jumps? }`

### outfit-catalog.ts

`OUTFITS: OutfitDef[]` —— 73 条（`classic` + 72 套）：`{ id, name, category, kind: 'suit'|'dress', price, color, description }`。

## 数据格式速览

- **manifest**（`character-manifest.json`）：每个网格以 `{ offset, length, type }` 字段表描述在二进制中的位置（`Float32Array`：position/normal/color/uv/skinWeight/bodyCoverage；`Uint16Array`：index/skinIndex），另含材质表（color/roughness/pattern/贴图引用）与 16 骨骼 rig（name/parent/matrix）。
- **网格包**：优先 fetch `<file>.pack`（gzip，走 `DecompressionStream` 解压），失败回退 `<file>.bin`。
- **贴图**：glTF 习惯 UV（`flipY = false`）；奶蛙 albedo 为 2048 清晰档，normal / metallicRoughness 为 mobile 档。
- **换装遮罩**：每套服装带 `bodyCoverage` 逐顶点浮点；穿上后 `outfitSurface=1`，奶蛙皮肤着色器对 `outfitCoverage >= -0.012` 的片元执行 `discard`（含阴影深度材质），实现"皮肤被衣服覆盖区域消失"——不透明穿模、裙摆自然。

## 来源

- 资产与数据格式：原版游戏 v6.4.0 官方蒙皮网格（位元级一致）
- 加载/换装/动画代码：[naiwarunning](https://github.com/43aquarius/naiwarunning) 项目自研实现（TypeScript + three r186）
