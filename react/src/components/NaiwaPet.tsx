'use client';

/* 奶蛙桌宠组件：四形态帧动画播放器 + 桌宠交互（点击/连点/拖拽甩飞物理 + 移动设备体感）。
 * 交互参数逐项对齐原版桌宠（43aquaris/naiwa · main.cpp）：
 *   - 单击 → smile（750ms 单次）
 *   - 1.5 秒内连点 5 次 → laugh（5667ms 单次，音效延迟 300ms 由音频层处理）
 *   - 拖拽松手 → 甩飞：重力 0.4px/f²、空气阻力 ×0.98/f、反弹保留 0.70、
 *     初速度取最近 100ms 轨迹；60fps 固定步长；物理量按显示高度比例缩放
 *   - 撞壁挤压：上下 0.40 / 左右 0.20，压缩 100ms + 复原 150ms
 *   - 身体碰撞盒取 idle 内容 bbox（占帧比例），避免透明留白先触壁
 * 体感（sensor=true，移动设备）：
 *   - DeviceMotion 加速度计 → 屏幕坐标系重力：手机倾斜时奶蛙向低处滚，
 *     平放时失重漂浮，握持直立时与原版重力一致
 *   - 高通分量 → 晃动冲击：摇晃手机让奶蛙在屏幕里来回碰撞
 *   - 自动探测 iOS/Android 加速度符号约定差异（运行时按姿态投影判定）
 * 撞墙笑：处于微笑/大笑模式时，每次真实撞击墙壁都会重新触发当前情绪 + 音效
 * 零第三方依赖：仅需 React；样式全部内联，可嵌入任意 React / Next.js 项目。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PET, loadPetAtlas, petAtlas, type PetMood } from '../lib/pet';

export interface NaiwaPetProps {
  /** 当前情绪（父组件驱动，如游戏事件反应） */
  mood?: PetMood;
  /** 变化时重置播放（用于重复触发同一情绪） */
  nonce?: number;
  /** 显示高度 px（可运行时自由调整，物理常数自动按比例重算） */
  size?: number;
  /** 桌宠交互模式：渲染为覆盖父容器的自由层，可点击 / 拖拽甩飞 */
  interactive?: boolean;
  /** 交互层底边留白（px）——奶蛙会落在这条"地板"上 */
  floorOffset?: number;
  /** 初始落点横向比例（0~1，松手前会受重力落到地板） */
  initX?: number;
  /** 交互音效回调（默认接内置 petVoice；传 null 可静音） */
  onEvent?: ((e: 'smile' | 'laugh') => void) | null;
  /** 开启移动设备体感物理（权限请求由父组件在用户手势内完成） */
  sensor?: boolean;
  /** 体感状态回报：on / off / nodata（用于父组件提示） */
  onSensor?: (state: 'on' | 'off' | 'nodata') => void;
  className?: string;
  style?: CSSProperties;
  /** 雪碧图未加载时的占位内容 */
  fallback?: ReactNode;
}

const FRAME_MS = 1000 / 60;
const CLICK_WINDOW = 1500;
const LAUGH_COUNT = 5;
const LAUGH_MS = 5667;
const SMILE_MS = 750;
const DRAG_THRESHOLD = 6;

/** 原版 laugh 显示尺寸：TARGET_W=180 → 高 718/518×180 ≈ 249.5px，物理常数基准 */
const REF_H = (718 / 518) * 180;

/** 撞墙笑：撞击速度阈值（px/f，按 k 缩放）与冷却时间 */
const HIT_SPEED = 2.5;
const HIT_COOLDOWN = 480;

/** 体感参数 */
const G_REF = 9.81;        // 1g 参考值（m/s²）
const SMOOTH_A = 0.15;     // 重力低通系数（每事件）
const JOLT_GAIN = 5.5;     // 晃动冲击增益（Δv = 高通/1g × GRAV × 增益）
const JOLT_CAP = 2.2;      // 单帧冲击上限（×k px/f）
const G_CLAMP = 1.6;       // 重力分量限幅（×1g）

interface DragState {
  offX: number; offY: number;
  moved: number; t0: number; dragged: boolean;
  hist: { t: number; x: number; y: number }[];
}

/** 体感运行时状态（事件侧写入，物理步进消费） */
interface SensorState {
  active: boolean;
  gx: number; gy: number;          // 低通后的屏幕重力（m/s²，y 向下为正）
  pjx: number; pjy: number;        // 待施加的晃动冲击（px/f 累积）
  sign: 0 | 1 | -1;                // 平台符号约定（0 = 未判定）
  samples: number;
  hasData: boolean;
}

/** device → CSS 屏幕（y 向下）分量映射，按屏幕方向角 */
function toScreen(dx: number, dy: number, ang: number): [number, number] {
  switch (ang) {
    case 90:  return [dy, dx];
    case 180: return [-dx, dy];
    case 270: return [-dy, -dx];
    default:  return [dx, -dy];
  }
}

function screenAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return ((screen.orientation.angle % 360) + 360) % 360;
  }
  const wo = typeof window !== 'undefined'
    ? (window as unknown as { orientation?: number }).orientation : undefined;
  if (typeof wo === 'number') return ((-wo % 360) + 360) % 360;  // 旧 API 符号相反
  return 0;
}

/** 当前方向下"设备直立"时的期望重力方向（spec 约定），用于符号自检 */
function uprightVector(ang: number): [number, number] {
  switch (ang) {
    case 90:  return [-1, 0];
    case 180: return [0, -1];
    case 270: return [1, 0];
    default:  return [0, 1];
  }
}

export default function NaiwaPet({
  mood = 'idle',
  nonce = 0,
  size = 200,
  interactive = false,
  floorOffset = 76,
  initX = 0.16,
  onEvent,
  sensor = false,
  onSensor,
  className,
  style,
  fallback,
}: NaiwaPetProps) {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!petAtlas());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  const anim = useRef({ mood: 'idle' as PetMood, frame: 0, elapsed: 0 });
  const local = useRef<{ mood: PetMood; until: number } | null>(null);
  const moodRef = useRef(mood);
  const onEventRef = useRef(onEvent);
  const clicks = useRef<number[]>([]);
  const sensorState = useRef<SensorState>({
    active: false, gx: 0, gy: G_REF, pjx: 0, pjy: 0,
    sign: 0, samples: 0, hasData: false,
  });
  const lastHitLaugh = useRef(0);
  const phys = useRef({
    x: 160, y: 200, vx: 0, vy: 0,
    drag: null as DragState | null,
    squish: null as null | { t: number; vertical: boolean },
  });
  const didInit = useRef(false);
  const nonceSeen = useRef<number | null>(null);

  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadPetAtlas().then(img => { if (alive && img) setReady(true); });
    return () => { alive = false; };
  }, [ready]);

  /* props 同步到 ref（避免渲染期写入） */
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  /* nonce 变化：让位给游戏事件情绪并重置动画 */
  useEffect(() => {
    if (nonceSeen.current !== null && nonceSeen.current !== nonce) {
      local.current = null;
      anim.current = { mood: 'idle', frame: 0, elapsed: 0 };
    }
    nonceSeen.current = nonce;
  }, [nonce]);

  /* ---------- 体感：DeviceMotion 监听（sensor=true 时挂载） ---------- */
  useEffect(() => {
    if (!sensor || typeof window === 'undefined') return;
    const s = sensorState.current;
    s.active = true; s.sign = 0; s.samples = 0; s.hasData = false;

    const onMotion = (ev: DeviceMotionEvent) => {
      const a = ev.accelerationIncludingGravity;
      /* 任一分量为 null 即丢弃（桌面 Chrome 会派发空事件，防污染重力状态） */
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const ax = a.x, ay = a.y, az = a.z;
      s.samples++;
      if (Math.abs(ax) + Math.abs(ay) + Math.abs(az) > 2) s.hasData = true;

      /* 符号约定自检：将观测投影到"当前方向直立"的期望重力上 */
      if (s.sign === 0) {
        const ang = screenAngle();
        const [ex, ey] = uprightVector(ang);
        const proj = ax * ex + ay * ey;
        if (proj > 3) s.sign = 1;
        else if (proj < -3) s.sign = -1;
        else if (s.samples > 150) s.sign = 1;   // ~2.5s 仍无法判定 → 按 spec 约定
        else return;
      }

      /* 设备坐标 → 规范化为 spec 约定 → 屏幕坐标（CSS y 向下） → 取物理力方向 */
      const ang = screenAngle();
      const [sx, sy] = toScreen(ax * s.sign, ay * s.sign, ang);
      const gx = -sx, gy = -sy;                 // 物理力 = -比力

      /* 低通 → 重力；高通 → 晃动冲击 */
      const lgx = s.gx + (gx - s.gx) * SMOOTH_A;
      const lgy = s.gy + (gy - s.gy) * SMOOTH_A;
      s.pjx += (gx - lgx) / G_REF;
      s.pjy += (gy - lgy) / G_REF;
      s.gx = lgx; s.gy = lgy;
    };

    window.addEventListener('devicemotion', onMotion);

    /* 数据可用性探测：1.5s 内没有有效样本则回报 nodata */
    const probe = window.setTimeout(() => {
      if (!s.hasData) {
        s.active = false;
        window.removeEventListener('devicemotion', onMotion);
        onSensor?.('nodata');
      } else {
        onSensor?.('on');
      }
    }, 1500);

    return () => {
      window.clearTimeout(probe);
      window.removeEventListener('devicemotion', onMotion);
      s.active = false;
      onSensor?.('off');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor]);

  /* ---------- 渲染 + 物理主循环 ---------- */
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = petAtlas();
    const layer = layerRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dispH = size;
    const dispW = size * (PET.frameW / PET.frameH);
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;

    const k = dispH / REF_H;
    const GRAV = 0.4 * k, DRAG = 0.98, BOUNCE = 0.70, STOP = 0.5 * k, SIDE_STOP = 3 * k;

    /* 缓存容器尺寸（ResizeObserver + 拖拽开始时刷新） */
    let bounds = { w: 0, h: 0 };
    const refreshBounds = () => {
      if (!layer) return;
      const r = layer.getBoundingClientRect();
      bounds = { w: r.width, h: r.height };
      /* 尺寸变化后把奶蛙夹回边界内 */
      const p0 = phys.current;
      p0.x = Math.min(Math.max(p0.x, dispW / 2 - PET.body.l * dispW), bounds.w - dispW / 2 + PET.body.r * dispW);
      p0.y = Math.min(Math.max(p0.y, dispH / 2 - PET.body.t * dispH), bounds.h - dispH / 2 + PET.body.b * dispH);
    };
    refreshBounds();
    const ro = new ResizeObserver(refreshBounds);
    if (layer) ro.observe(layer);

    /* 交互模式：初始落点（左上方入场，受重力落到地板） */
    if (interactive && !didInit.current && bounds.w > 0) {
      didInit.current = true;
      phys.current.x = Math.max(dispW / 2 + 10, bounds.w * initX);
      phys.current.y = bounds.h * 0.3;
    }

    const effectiveMood = (): PetMood => {
      const l = local.current;
      if (l && performance.now() < l.until) return l.mood;
      local.current = null;
      return moodRef.current;
    };

    /* 撞墙笑：微笑/大笑模式下，真实撞击 → 重新触发当前情绪 + 音效 */
    const hitLaugh = (now: number, speed: number) => {
      if (speed < HIT_SPEED * k) return;                    // 贴墙滑动/静置不算
      if (now - lastHitLaugh.current < HIT_COOLDOWN) return; // 冷却，防止连帧重复
      const m = effectiveMood();
      if (m !== 'smile' && m !== 'laugh') return;
      lastHitLaugh.current = now;
      anim.current = { mood: m, frame: 0, elapsed: 0 };
      const l = local.current;
      if (l && l.mood === m) l.until = now + (m === 'laugh' ? LAUGH_MS : SMILE_MS);
      onEventRef.current?.(m);
    };

    const squishScale = (now: number): [number, number] => {
      const s = phys.current.squish;
      if (!s) return [1, 1];
      const e = now - s.t;
      const amt = s.vertical ? 0.4 : 0.2;
      let sq: number, ex: number;
      if (e < 100) { const t = e / 100; sq = 1 - amt * t; ex = 1 + amt * t; }
      else if (e < 250) { const t = (e - 100) / 150; sq = (1 - amt) + amt * t; ex = (1 + amt) - amt * t; }
      else { phys.current.squish = null; return [1, 1]; }
      return s.vertical ? [ex, sq] : [sq, ex];   // [scaleX, scaleY]
    };

    const step = (now: number) => {
      const p = phys.current;

      /* 物理步进（固定 60Hz；拖拽中不做力累积，位置由指针直接驱动） */
      if (interactive && bounds.w > 0) {
        if (p.drag) {
          p.vx = 0; p.vy = 0;
        } else {
          const sn = sensorState.current;
          if (sn.active && sn.sign !== 0) {
            /* 体感模式：屏幕坐标系真实重力 + 晃动冲击（平放≈失重，倾斜→滚向低处） */
            const gxn = Math.max(-G_CLAMP, Math.min(G_CLAMP, sn.gx / G_REF));
            const gyn = Math.max(-G_CLAMP, Math.min(G_CLAMP, sn.gy / G_REF));
            p.vx += gxn * GRAV;
            p.vy += gyn * GRAV;
            const cap = JOLT_CAP * k;
            let jx = sn.pjx * GRAV * JOLT_GAIN;
            let jy = sn.pjy * GRAV * JOLT_GAIN;
            jx = Math.max(-cap, Math.min(cap, jx));
            jy = Math.max(-cap, Math.min(cap, jy));
            p.vx += jx; p.vy += jy;
            sn.pjx = 0; sn.pjy = 0;
          } else {
            p.vy += GRAV;
          }
          p.vx *= DRAG; p.vy *= DRAG;
          p.x += p.vx; p.y += p.vy;
          const bl = p.x - dispW / 2 + PET.body.l * dispW;
          const br = p.x + dispW / 2 - PET.body.r * dispW;
          const bt = p.y - dispH / 2 + PET.body.t * dispH;
          const bb = p.y + dispH / 2 - PET.body.b * dispH;
          if (bl < 0) {
            p.x -= bl;
            hitLaugh(now, Math.abs(p.vx));
            p.vx = Math.abs(p.vx) < SIDE_STOP ? 0 : Math.abs(p.vx) * BOUNCE;
            p.squish = { t: now, vertical: false };
          } else if (br > bounds.w) {
            p.x -= br - bounds.w;
            hitLaugh(now, Math.abs(p.vx));
            p.vx = Math.abs(p.vx) < SIDE_STOP ? 0 : -Math.abs(p.vx) * BOUNCE;
            p.squish = { t: now, vertical: false };
          }
          if (bt < 0) {
            p.y -= bt;
            hitLaugh(now, Math.abs(p.vy));
            p.vy = Math.abs(p.vy) * BOUNCE;
            p.squish = { t: now, vertical: true };
          } else if (bb > bounds.h) {
            p.y -= bb - bounds.h;
            hitLaugh(now, Math.abs(p.vy));
            p.vy = Math.abs(p.vy) < STOP ? 0 : -Math.abs(p.vy) * BOUNCE;
            p.squish = { t: now, vertical: true };
          }
        }
      }

      /* 帧推进（12fps；情绪切换时从头播） */
      const m = effectiveMood();
      if (m !== anim.current.mood) anim.current = { mood: m, frame: 0, elapsed: 0 };
      anim.current.elapsed += FRAME_MS;
      if (anim.current.elapsed >= 1000 / PET.fps) {
        anim.current.elapsed -= 1000 / PET.fps;
        const def = PET.forms[anim.current.mood];
        if (anim.current.frame + 1 < def.frames) anim.current.frame++;
        else if (def.loop) anim.current.frame = 0;
        /* 单次形态停在末帧，由 local/props 到期回落 */
      }
    };

    const draw = (now: number) => {
      const def = PET.forms[anim.current.mood];
      const gi = def.start + Math.min(anim.current.frame, def.frames - 1);
      const col = gi % PET.cols, row = Math.floor(gi / PET.cols);
      const [sx, sy] = squishScale(now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const cx = canvas.width / 2, cy = canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.translate(-cx, -cy);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img,
        col * PET.frameW, row * PET.frameH, PET.frameW, PET.frameH,
        0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = now - last;
      last = now;
      if (dt > 200) dt = 200;   // 页签切回时防止追帧爆发
      acc += dt;
      let n = 0;
      while (acc >= FRAME_MS && n++ < 12) { step(now); acc -= FRAME_MS; }
      if (interactive) {
        const p = phys.current;
        canvas.style.transform = `translate(${p.x - dispW / 2}px, ${p.y - dispH / 2}px)`;
        canvas.style.cursor = p.drag ? 'grabbing' : 'grab';
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ready, size, interactive, initX]);

  /* ---------- 交互绑定（仅 interactive） ---------- */
  const bindCanvas = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (!el || !interactive) return;
    const key = '__naiwaPetBound';
    if ((el as unknown as Record<string, unknown>)[key]) return;
    (el as unknown as Record<string, unknown>)[key] = true;

    const p = phys.current;
    const layerOf = () => layerRef.current;

    el.addEventListener('pointerdown', (ev: PointerEvent) => {
      ev.preventDefault();
      try { el.setPointerCapture(ev.pointerId); } catch { /* 合成事件 / 特殊输入设备 */ }
      const layer = layerOf();
      if (!layer) return;
      const lr = layer.getBoundingClientRect();
      /* offX/offY = 指针相对奶蛙中心的偏移（层坐标系） */
      p.drag = {
        offX: (ev.clientX - lr.left) - p.x,
        offY: (ev.clientY - lr.top) - p.y,
        moved: 0, t0: performance.now(), dragged: false,
        hist: [{ t: performance.now(), x: p.x, y: p.y }],
      };
      p.vx = 0; p.vy = 0;
    });

    el.addEventListener('pointermove', (ev: PointerEvent) => {
      const d = p.drag;
      const layer = layerOf();
      if (!d || !layer) return;
      const lr = layer.getBoundingClientRect();
      const nx = (ev.clientX - lr.left) - d.offX;
      const ny = (ev.clientY - lr.top) - d.offY;
      d.moved += Math.hypot(nx - p.x, ny - p.y);
      if (d.moved > DRAG_THRESHOLD) d.dragged = true;
      p.x = nx; p.y = ny;
      const now = performance.now();
      d.hist.push({ t: now, x: nx, y: ny });
      while (d.hist.length > 2 && now - d.hist[0].t > 100) d.hist.shift();
    });

    const finish = () => {
      const d = p.drag;
      if (!d) return;
      p.drag = null;
      const now = performance.now();

      if (!d.dragged && now - d.t0 < 500) {
        /* 点击：大笑期间忽略；连点 5 次大笑，否则微笑（与原版一致） */
        const busy = local.current?.mood === 'laugh' && now < local.current.until;
        if (!busy) {
          clicks.current = clicks.current.filter(t => now - t < CLICK_WINDOW);
          clicks.current.push(now);
          if (clicks.current.length >= LAUGH_COUNT) {
            clicks.current = [];
            local.current = { mood: 'laugh', until: now + LAUGH_MS };
            onEventRef.current?.('laugh');
          } else {
            local.current = { mood: 'smile', until: now + SMILE_MS };
            onEventRef.current?.('smile');
          }
        }
        return;
      }
      /* 甩飞：初速度 = 最近 100ms 位移 / 帧数（px/frame） */
      const h = d.hist;
      if (h.length >= 2) {
        const first = h[0];
        const dt = now - first.t;
        if (dt > 12) {
          const frames = dt / FRAME_MS;
          p.vx = (p.x - first.x) / frames;
          p.vy = (p.y - first.y) / frames;
        }
      }
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  };

  if (!ready) return <>{fallback ?? null}</>;

  if (interactive) {
    return (
      <div ref={layerRef}
        className={className}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          bottom: floorOffset,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 15,
          ...style,
        }}>
        <canvas ref={bindCanvas} style={{
          position: 'absolute', left: 0, top: 0,
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          willChange: 'transform',
        }} />
      </div>
    );
  }

  return (
    <div className={className}
      style={{ display: 'inline-block', lineHeight: 0, width: size * (PET.frameW / PET.frameH), height: size, ...style }}>
      <canvas ref={bindCanvas} style={{ display: 'block' }} />
    </div>
  );
}
