'use client';

/* 奶蛙桌宠 Web Playground：
 * 全屏交互层（可拖拽甩飞 / 点击 / 连点）+ 情绪控制面板 + 内置音效。
 */
import { useCallback, useEffect, useState } from 'react';
import NaiwaPet from '../components/NaiwaPet';
import { petVoice, type PetMood } from '../lib/pet';

const MOODS: { key: PetMood; label: string; desc: string }[] = [
  { key: 'idle', label: '待机', desc: '58 帧循环呼吸' },
  { key: 'smile', label: '微笑', desc: '9 帧 · 750ms 单次' },
  { key: 'laugh', label: '大笑', desc: '68 帧 · 5667ms 单次' },
  { key: 'cry', label: '哭泣', desc: '39 帧循环' },
];

export default function Home() {
  const [mood, setMood] = useState<PetMood>('idle');
  const [nonce, setNonce] = useState(0);
  const [sound, setSound] = useState(true);
  const [tip, setTip] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTip(false), 8000);
    return () => clearTimeout(t);
  }, []);

  /* 内置音效：smile 即时、laugh 延迟 300ms（对齐原版） */
  const onEvent = useCallback((e: 'smile' | 'laugh') => {
    if (sound) petVoice(e, e === 'laugh' ? 300 : 0);
  }, [sound]);

  const trigger = (m: PetMood) => {
    setMood(m);
    setNonce(n => n + 1);
    if (sound && (m === 'smile' || m === 'laugh')) petVoice(m, m === 'laugh' ? 300 : 0);
  };

  return (
    <main style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(1200px 800px at 70% 20%, #fdf6e3 0%, #f5e9c8 45%, #ecd9a8 100%)',
      fontFamily: 'ui-rounded, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    }}>
      {/* 标题 */}
      <header style={{
        position: 'absolute', top: 22, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none', zIndex: 5,
      }}>
        <h1 style={{ margin: 0, fontSize: 26, color: '#6b5322', letterSpacing: 2 }}>
          🐸 奶蛙桌宠 · Web 版
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#a08a55' }}>
          单击微笑 · 1.5 秒内连点 5 次大笑 · 拖住它甩出去！
        </p>
      </header>

      {/* 桌宠交互层 */}
      <NaiwaPet
        mood={mood}
        nonce={nonce}
        size={210}
        interactive
        floorOffset={118}
        initX={0.18}
        onEvent={onEvent}
        fallback={<div style={{ padding: 40, color: '#a08a55' }}>加载奶蛙中…</div>}
      />

      {/* 入场提示气泡 */}
      {tip && (
        <div style={{
          position: 'absolute', left: '50%', top: '38%',
          transform: 'translate(-50%, 0)',
          background: 'rgba(255,255,255,.9)', color: '#6b5322',
          padding: '10px 18px', borderRadius: 14, fontSize: 14,
          boxShadow: '0 6px 24px rgba(107,83,34,.18)',
          pointerEvents: 'none', zIndex: 6,
          transition: 'opacity .6s',
        }}>
          把奶蛙拖起来，朝任意方向甩出去试试 🎯
        </div>
      )}

      {/* 控制面板 */}
      <footer style={{
        position: 'absolute', left: '50%', bottom: 18,
        transform: 'translateX(-50%)',
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(8px)',
        borderRadius: 18, padding: '12px 16px',
        boxShadow: '0 8px 30px rgba(107,83,34,.16)',
        zIndex: 20, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: '94vw',
      }}>
        {MOODS.map(m => (
          <button key={m.key} onClick={() => trigger(m.key)}
            title={m.desc}
            style={{
              border: mood === m.key ? '2px solid #e8a83a' : '2px solid transparent',
              background: mood === m.key ? '#fff3d6' : '#fff',
              color: '#6b5322', borderRadius: 12, padding: '8px 16px',
              fontSize: 14, cursor: 'pointer', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(107,83,34,.10)',
            }}>
            {m.label}
          </button>
        ))}
        <span style={{ width: 1, height: 26, background: '#e5d5aa' }} />
        <button onClick={() => setSound(s => !s)}
          style={{
            border: 'none', background: sound ? '#fff3d6' : '#f1ede0',
            color: '#6b5322', borderRadius: 12, padding: '8px 14px',
            fontSize: 14, cursor: 'pointer', fontWeight: 600,
          }}>
          {sound ? '🔊 音效开' : '🔇 音效关'}
        </button>
      </footer>
    </main>
  );
}
