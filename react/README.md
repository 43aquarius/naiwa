# 奶蛙桌宠 · React 组件版

零第三方 UI 依赖的 `NaiwaPet` React 组件（纯 React + Canvas，内联样式），可嵌入任意 React / Next.js 项目；本目录同时是一个可直接运行的 Next.js demo。

## 运行 demo

```bash
bun install     # 或 npm install
bun run dev     # http://localhost:3100
```

## 嵌入到你自己的项目

1. 复制两个文件：`src/components/NaiwaPet.tsx` + `src/lib/pet.ts`
2. 复制素材：`public/assets/pet/`（雪碧图 + 2 个音效，共约 2MB）
3. 使用：

```tsx
import NaiwaPet from './components/NaiwaPet';
import { petVoice } from './lib/pet';

/* 交互模式：覆盖全屏自由层，可点击 / 拖拽甩飞 */
<NaiwaPet
  interactive          // 开启物理与交互（默认仅播放动画）
  size={210}           // 显示高度 px
  floorOffset={118}    // 底部"地板"留白（px）
  mood="idle"          // 外部驱动情绪：idle / smile / laugh / cry
  nonce={0}            // 变化时重置动画（重复触发同一情绪）
  initX={0.18}         // 初始落点横向比例
  onEvent={(e) => petVoice(e, e === 'laugh' ? 300 : 0)}  // 内置音效；传 null 静音
/>

/* 播放模式：纯展示（如 HUD 陪伴、结算表情） */
<NaiwaPet mood="laugh" size={140} />
```

### Props

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mood` | `'idle' \| 'smile' \| 'laugh' \| 'cry'` | `'idle'` | 外部驱动的情绪 |
| `nonce` | `number` | `0` | 变化时重置播放（重复触发同一情绪） |
| `size` | `number` | `200` | 显示高度 px |
| `interactive` | `boolean` | `false` | 交互模式（点击 / 拖拽甩飞物理） |
| `floorOffset` | `number` | `76` | 交互层底边留白（"地板"高度） |
| `initX` | `number` | `0.16` | 初始落点横向比例 0~1 |
| `onEvent` | `(e: 'smile' \| 'laugh') => void \| null` | — | 交互事件回调（接入音效；`null` 静音） |
| `className` / `style` | — | — | 容器自定义样式 |
| `fallback` | `ReactNode` | — | 雪碧图未加载时的占位 |

### 情绪优先级

点击触发的情绪（`smile`/`laugh`）在其时长内优先于 `props.mood`，到期后自动回落到 `props.mood`；`nonce` 变化会让位给外部情绪并重置动画。

## 素材再生成

```bash
# 依赖 Pillow；SRC 指向原版桌宠 assets/（idle/smile/laugh/cry 帧目录）
python3 scripts/build_pet_sprites.py
```

## 本次更新（desktop-pet 分支）

| 文件 | 改动 |
|------|------|
| `src/app/layout.tsx` | 新增 `viewport` 导出：禁缩放 + `viewportFit: cover`（iPhone 安全区） |
| `src/components/NaiwaPet.tsx` | 新增 `sensor` / `onSensor` props：DeviceMotion 体感物理（屏幕坐标系真实重力 + 晃动冲击 + 符号约定自检）；撞墙笑逻辑（微笑/大笑模式撞击墙壁重新触发情绪 + 音效） |
| `src/app/page.tsx` | 入场提示自动消失；可隐藏面板 + 🐸 悬浮唤回按钮；大小滑杆（80–420px）；体感开关（iOS 权限请求 + 降级 Toast）；动态地板；移动端响应式样式 |

### 体感物理说明

开启「📱 体感」后（需真实移动设备 + HTTPS 环境）：

- **倾斜手机** → 奶蛙向低处滚动（重力实时映射到屏幕坐标系，按屏幕方向角自动旋转）
- **手机平放** → 近似失重，奶蛙漂浮（真·物理）
- **摇晃手机** → 高通分量产生冲击，奶蛙在屏幕里来回碰撞
- **iOS/Android 加速度符号差异** → 运行时按"直立姿态投影"自动判定，无需区分平台
- **桌面/无传感器** → 1.5s 数据探测失败后自动关闭并提示

### 撞墙笑说明

处于「微笑」或「大笑」模式（面板按钮或连点触发均可）时，奶蛙每次**真实撞击**墙壁（撞击速度 > 2.5px/f，480ms 冷却）都会从头重播当前情绪动画并播放音效。
