'use client';

/* 奶蛙桌宠 Web Playground：
 * 全屏交互层（可拖拽甩飞 / 点击 / 连点 / 移动设备体感）+ 情绪控制面板 + 内置音效。
 * 面板功能：情绪切换、音效开关、奶蛙大小滑杆、体感开关、面板收起/展开。
 * 入场提示（标题 + 操作说明）仅在进入页面时短暂显示，之后不再出现。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import NaiwaPet from '../components/NaiwaPet';
import { petVoice, type PetMood } from '../lib/pet';

const MOODS: { key: PetMood; label: string; desc: string }[] = [
  { key: 'idle', label: '待机', desc: '58 帧循环呼吸' },
  { key: 'smile', label: '微笑', desc: '9 帧 · 750ms · 撞墙就笑' },
  { key: 'laugh', label: '大笑', desc: '68 帧 · 5667ms · 撞墙就笑' },
  { key: 'cry', label: '哭泣', desc: '39 帧循环' },
];

const SIZE_MIN = 80, SIZE_MAX = 420;

/** 移动端默认尺寸更小（竖屏宽度有限） */
function defaultSize(): number {
  if (typeof window === 'undefined') return 210;
  return Math.min(window.innerWidth, window.innerHeight) < 560 ? 170 : 210;
}

/** Toast 提示 */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string, ms = 2600) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), ms);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { msg, show };
}

export default function Home() {
  const [mood, setMood] = useState<PetMood>('idle');
  const [nonce, setNonce] = useState(0);
  const [sound, setSound] = useState(true);
  const [size, setSize] = useState(defaultSize);
  const [panelHidden, setPanelHidden] = useState(false);
  const [sensorOn, setSensorOn] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const [introFading, setIntroFading] = useState(false);
  const [floor, setFloor] = useState(118);
  const footerRef = useRef<HTMLElement | null>(null);
  const { msg: toastMsg, show: showToast } = useToast();

  /* ---------- 入场提示：7 秒后或首次触屏时淡出，之后不再显示 ---------- */
  useEffect(() => {
    const dismiss = () => setIntroFading(true);
    const t = setTimeout(dismiss, 7000);
    window.addEventListener('pointerdown', dismiss, { once: true, capture: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', dismiss, { capture: true }); };
  }, []);
  useEffect(() => {
    if (!introFading) return;
    const t = setTimeout(() => setIntroGone(true), 700);
    return () => clearTimeout(t);
  }, [introFading]);

  /* ---------- 动态地板：面板换行/收起/旋转屏时自动调整 ---------- */
  useEffect(() => {
    const el = footerRef.current;
    const update = () => {
      if (!el) return;
      if (panelHidden) { setFloor(12); return; }
      /* offsetHeight 不受过渡 transform 影响；computed bottom 已解析 env(safe-area-inset-*) */
      const bottom = parseFloat(getComputedStyle(el).bottom) || 14;
      const gap = Math.min(window.innerWidth, window.innerHeight) < 560 ? 8 : 16;
      setFloor(Math.max(12, el.offsetHeight + bottom + gap));
    };
    update();
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, [panelHidden]);

  /* ---------- 内置音效：smile 即时、laugh 延迟 300ms（对齐原版） ---------- */
  const onEvent = useCallback((e: 'smile' | 'laugh') => {
    if (sound) petVoice(e, e === 'laugh' ? 300 : 0);
  }, [sound]);

  const trigger = (m: PetMood) => {
    setMood(m);
    setNonce(n => n + 1);
    if (sound && (m === 'smile' || m === 'laugh')) petVoice(m, m === 'laugh' ? 300 : 0);
  };

  /* ---------- 体感开关：iOS 需在用户手势内请求权限 ---------- */
  const toggleSensor = async () => {
    if (sensorOn) { setSensorOn(false); return; }
    if (typeof window === 'undefined' || typeof (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent === 'undefined') {
      showToast('当前浏览器不支持体感 😢');
      return;
    }
    const DME = (window as unknown as { DeviceMotionEvent: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (typeof DME.requestPermission === 'function') {
      try {
        const r = await DME.requestPermission();
        if (r !== 'granted') { showToast('体感权限被拒绝，可在系统设置中开启"动作与方向"'); return; }
      } catch { return; }
    }
    setSensorOn(true);   // 数据可用性由 onSensor 回报
  };

  const onSensor = useCallback((state: 'on' | 'off' | 'nodata') => {
    if (state === 'nodata') {
      setSensorOn(false);
      showToast('未检测到传感器数据（需要手机 + HTTPS 环境）');
    }
  }, [showToast]);

  const btn = (active: boolean): React.CSSProperties => ({
    border: active ? '2px solid #e8a83a' : '2px solid transparent',
    background: active ? '#fff3d6' : '#fff',
    color: '#6b5322', borderRadius: 12, padding: '8px 16px',
    fontSize: 14, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(107,83,34,.10)',
    touchAction: 'manipulation', whiteSpace: 'nowrap',
  });

  return (
    <main style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(1200px 800px at 70% 20%, #fdf6e3 0%, #f5e9c8 45%, #ecd9a8 100%)',
      fontFamily: 'ui-rounded, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    }}>
      {/* 手机适配：小屏面板紧凑排版 */}
      <style>{`
        @media (max-width: 640px), (max-height: 560px) {
          .naiwa-panel { width: calc(100vw - 24px) !important; padding: 8px 10px; gap: 6px; row-gap: 7px; }
          .naiwa-panel > button { flex: 1 1 auto; }
          .naiwa-panel > .sep { display: none; }
          .naiwa-panel > .sizer { flex: 1 1 auto; min-width: 200px; justify-content: center; }
        }
      `}</style>
      {/* 入场提示（仅首次进入时显示，淡出后不再出现） */}
      {!introGone && (
        <div style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none', zIndex: 5,
          opacity: introFading ? 0 : 1, transition: 'opacity .7s',
        }}>
          <div style={{
            position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center',
          }}>
            <h1 style={{
              margin: 0, fontSize: 'clamp(19px, 5vw, 26px)', color: '#6b5322',
              letterSpacing: 2,
            }}>
              🐸 奶蛙桌宠 · Web 版
            </h1>
            <p style={{ margin: '6px 4vw 0', fontSize: 'clamp(12px, 3.4vw, 13px)', color: '#a08a55' }}>
              单击微笑 · 1.5 秒内连点 5 次大笑 · 拖住它甩出去！
            </p>
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: '38%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,.9)', color: '#6b5322',
            padding: '10px 18px', borderRadius: 14, fontSize: 'clamp(12px, 3.4vw, 14px)',
            boxShadow: '0 6px 24px rgba(107,83,34,.18)',
            whiteSpace: 'nowrap',
          }}>
            把奶蛙拖起来，朝任意方向甩出去试试 🎯
          </div>
        </div>
      )}

      {/* 桌宠交互层 */}
      <NaiwaPet
        mood={mood}
        nonce={nonce}
        size={size}
        interactive
        floorOffset={floor}
        initX={0.18}
        onEvent={onEvent}
        sensor={sensorOn}
        onSensor={onSensor}
        fallback={<div style={{ padding: 40, color: '#a08a55' }}>加载奶蛙中…</div>}
      />

      {/* 控制面板（可隐藏） */}
      <footer ref={footerRef} className="naiwa-panel" style={{
        position: 'absolute', left: '50%', bottom: 'max(14px, env(safe-area-inset-bottom))',
        transform: panelHidden
          ? 'translateX(-50%) translateY(24px) scale(.96)'
          : 'translateX(-50%)',
        opacity: panelHidden ? 0 : 1,
        pointerEvents: panelHidden ? 'none' : 'auto',
        display: 'flex', gap: 8, alignItems: 'center', rowGap: 8,
        background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 18, padding: '10px 14px',
        boxShadow: '0 8px 30px rgba(107,83,34,.16)',
        zIndex: 20, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: '94vw',
        transition: 'opacity .3s, transform .3s',
      }}>
        {MOODS.map(m => (
          <button key={m.key} onClick={() => trigger(m.key)}
            title={m.desc}
            style={{ ...btn(mood === m.key), padding: '8px 13px', fontSize: 13.5 }}>
            {m.label}
          </button>
        ))}
        <span className="sep" style={{ width: 1, height: 26, background: '#e5d5aa' }} />
        <button onClick={() => setSound(s => !s)}
          style={{
            ...btn(false),
            background: sound ? '#fff3d6' : '#f1ede0',
            border: sound ? '2px solid #e8a83a' : '2px solid transparent',
            padding: '8px 12px', fontSize: 13.5,
          }}>
          {sound ? '🔊 音效开' : '🔇 音效关'}
        </button>
        {/* 体感开关（移动设备） */}
        <button onClick={toggleSensor}
          title="使用手机重力/晃动驱动奶蛙"
          style={{
            ...btn(false),
            background: sensorOn ? '#fff3d6' : '#fff',
            border: sensorOn ? '2px solid #e8a83a' : '2px solid transparent',
            padding: '8px 12px', fontSize: 13.5,
          }}>
          {sensorOn ? '📱 体感开' : '📱 体感关'}
        </button>
        {/* 大小滑杆 */}
        <label className="sizer" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#6b5322', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          大小
          <input
            type="range" min={SIZE_MIN} max={SIZE_MAX} step={2} value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{ width: 96, accentColor: '#e8a83a', touchAction: 'manipulation' }}
            aria-label="奶蛙大小"
          />
          <span style={{ minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {size}
          </span>
        </label>
        <span className="sep" style={{ width: 1, height: 26, background: '#e5d5aa' }} />
        {/* 收起面板 */}
        <button onClick={() => setPanelHidden(true)}
          title="隐藏控制面板"
          style={{
            ...btn(false), background: '#f1ede0', padding: '8px 11px', fontSize: 13.5,
          }}>
          收起 ▾
        </button>
      </footer>

      {/* 面板隐藏后的悬浮展开按钮 */}
      {panelHidden && (
        <button onClick={() => setPanelHidden(false)}
          title="展开控制面板"
          aria-label="展开控制面板"
          style={{
            position: 'absolute', right: 16,
            bottom: 'max(18px, env(safe-area-inset-bottom))',
            width: 46, height: 46, borderRadius: '50%',
            border: 'none', background: 'rgba(255,255,255,.82)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 4px 16px rgba(107,83,34,.20)',
            fontSize: 22, cursor: 'pointer', zIndex: 20,
            opacity: 0.72, transition: 'opacity .2s',
            touchAction: 'manipulation', lineHeight: '46px', padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.72'; }}
        >
          🐸
        </button>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'absolute', left: '50%', top: 18,
          transform: 'translateX(-50%)',
          background: 'rgba(80,62,25,.92)', color: '#fff',
          padding: '9px 18px', borderRadius: 12, fontSize: 13.5,
          zIndex: 30, maxWidth: '86vw', textAlign: 'center',
          boxShadow: '0 6px 20px rgba(0,0,0,.18)',
        }}>
          {toastMsg}
        </div>
      )}
    </main>
  );
}
