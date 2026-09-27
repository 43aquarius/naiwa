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
