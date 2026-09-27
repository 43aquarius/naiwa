/* ============================================================
 * nailong-pet web —— 网页版奶龙桌宠
 * 对应桌面版 src/main.cpp 的完整功能移植：
 *   1. 帧动画系统：idle / smile / laugh / cry 四套动画，12fps 播放
 *   2. 单击触发微笑（750ms），1.5 秒内连点 5 次触发大笑（5667ms）+ 300ms 延迟音效
 *   3. 快速甩动后触发物理飞行：重力、空气阻力、边缘弹跳、碰撞形变（squish）
 *   4. 过载监控：以「主线程长任务占比过高 / JS 堆占用过高」替代桌面版
 *      CPU/内存读取，过载时奶龙先进入 1 秒 PreCry 过渡再进入 Cry 哭泣循环；
 *      右键菜单另提供「模拟系统过载」演示开关
 *   5. 连续使用 60 分钟触发疲惫状态，显示 "Take a break!" 气泡
 *   6. 启动 / 页面重新可见（≈电脑唤醒）时显示打招呼气泡：
 *      问候语、日期、陪伴时长、IP 属地（查询完成后原地刷新）
 *   7. 陪伴时长跨会话持久化（localStorage，对应桌面版 nailong_time.txt）
 *   8. 音效系统：smile / laugh 播放真实 MP3，支持静音开关
 *   9. 右键菜单：关闭 / 最小化到托盘 / 固定 / 禁用大笑 / 静音 /
 *      模拟过载 / 刷新至正常状态，顶部展示 FPS、陪伴时长、IP 属地
 *  10. Escape 关闭（奶龙下班），可随时召回
 * ============================================================ */
'use strict';

/* ============================================================
 * 常量：全部与桌面版 main.cpp 逐项对齐
 * ============================================================ */

// 素材根目录：web/ 页面通过相对路径复用仓库原始素材，零拷贝
const ASSET_ROOT = '../assets';

// 四套帧动画定义（帧数 / 是否循环 / 帧率与桌面版一致）
const ANIM_DEFS = {
  idle:  { count: 58, loop: true  }, // 默认状态循环
  smile: { count: 9,  loop: false }, // 只播一遍，与 750ms 状态时长对齐
  laugh: { count: 68, loop: false }, // 只播一遍，与 5667ms 状态时长对齐
  cry:   { count: 39, loop: true  }, // 持续循环直至负载恢复
};
const ANIM_FPS = 12;

// 渲染尺寸：以 laugh 第一帧为基准统一校准（桌面版 TARGET_W = 180）
const LAUGH_IMG_W = 518, LAUGH_IMG_H = 718;
const TARGET_W = 180;
const rendW = TARGET_W;                          // 渲染框宽
const rendH = TARGET_W * LAUGH_IMG_H / LAUGH_IMG_W; // 渲染框高（约 249.5）

// idle_01.png 的内容 bounding box（由 compute_body_bbox.py 生成，原始像素单位）
// 用于把碰撞检测对齐到奶龙身体，而不是整张透明图
const IDLE_BBOX = { ox: 94, oy: 30, w: 329, h: 657 };
// 换算到渲染框后的身体矩形（bodyBox.offL/offT = 身体距渲染框左/上的距离）
const bodyBox = {
  offL: IDLE_BBOX.ox * rendW / LAUGH_IMG_W,
  offT: IDLE_BBOX.oy * rendH / LAUGH_IMG_H,
  w:    IDLE_BBOX.w  * rendW / LAUGH_IMG_W,
  h:    IDLE_BBOX.h  * rendH / LAUGH_IMG_H,
};
// 身体右/下边到渲染框右/下边的距离（反弹判定用）
const bodyOffR = rendW - bodyBox.offL - bodyBox.w;
const bodyOffB = rendH - bodyBox.offT - bodyBox.h;

// 点击互动（与桌面版一致）
const LAUGH_N = 5;          // 触发大笑所需连击次数
const RAPID_MS = 1500;      // 连击有效时间窗口
const SMILE_MS = 750;       // 微笑状态持续时长（9 帧 × 1/12s）
const LAUGH_MS = 5667;      // 大笑状态持续时长（68 帧 × 1/12s）
const LAUGH_SOUND_DELAY = 300; // 大笑音效延迟播放，避免音画不同步

// 状态与提醒
const PRECRY_MS = 1000;     // PreCry 过渡时长
const GREET_MS = 20000;     // 打招呼气泡显示时长
const TIRED_MS = 60 * 60 * 1000; // 连续使用 60 分钟触发疲惫
const FORCE_NORMAL_MS = 30000;   // 「刷新至正常状态」后 30 秒内屏蔽过载/疲惫检测

// 过载判定（替代桌面版 CPU>70% / 内存>80%）
const LONGTASK_BUSY = 0.4;  // 采样窗口内长任务(>50ms)时长占比超过 40% → 过载
const HEAP_BUSY = 80;       // JS 堆占用超过 80%（仅 Chrome 系浏览器可读）→ 过载
const SYS_SAMPLE_MS = 2000; // 系统采样周期（对应桌面版每 2 秒采样）

// 物理常数（与桌面版一致，单位：像素/帧，60fps 固定步长）
const PHYS = {
  GRAVITY: 0.4,   // 每步重力加速度
  DRAG: 0.98,     // 空气阻力衰减系数
  BOUNCE: 0.70,   // 反弹能量保留比例
  STEP_MS: 1000 / 60,
};

// 碰撞挤压动画（与桌面版一致：上下边缘强形变 0.4，左右弱形变 0.2）
const SQUISH_COMPRESS_MS = 100, SQUISH_RESTORE_MS = 150;

// 陪伴时长持久化键（对应桌面版 nailong_time.txt）
const LS_KEY = 'nailong_web_companion_minutes';

/* ============================================================
 * 桌宠状态枚举（与桌面版一致）
 *   Normal / Smile / Laugh / Tired / PreCry / Cry / Drag
 * ============================================================ */
const State = { Normal: 0, Smile: 1, Laugh: 2, Tired: 3, PreCry: 4, Cry: 5, Drag: 6 };

/* ============================================================
 * DOM 引用
 * ============================================================ */
const $ = id => document.getElementById(id);
const petEl = $('pet'), loadingEl = $('loading'), loadFill = $('load-fill'), loadTxt = $('load-txt');
const greetEl = $('greet-bubble'), tiredEl = $('tired-bubble');
const trayBtn = $('tray-btn'), menuEl = $('menu'), hintEl = $('hint');
const closedOverlay = $('closed-overlay'), reviveBtn = $('revive-btn'), fallbackEl = $('fallback');

/* ============================================================
 * 运行时状态变量（与桌面版 main() 局部变量一一对应）
 * ============================================================ */
let state = State.Normal;      // 当前桌宠状态
let stateEnd = 0;              // Smile/Laugh 状态到期时间戳（ms）
let prevBusy = false;          // 上一帧过载结果，用于检测上升沿触发 PreCry
let preCryStart = 0;           // PreCry 状态开始时间
let tired = false;             // 疲惫标志：一旦置 true 不再重置（除非手动刷新）
let forceNormal = false;       // 「刷新至正常状态」强制标志
let forceNormalUntil = 0;
let startTime = performance.now(); // 本次会话起点：疲惫倒计时 + 陪伴时长共用

let isMuted = false;           // 静音开关
let isPinned = false;          // 固定位置：禁止拖动与甩动
let laughDisabled = false;     // 禁用大笑：点击不触发 Smile/Laugh
let simulateOverload = false;  // 演示开关：强制视为系统过载

let closed = false;            // 「奶龙下班」标志（对应桌面版进程退出）
let minimized = false;         // 最小化到托盘标志
let menuOpen = false;          // 右键菜单是否打开（打开期间暂停物理，对应原生菜单的模态行为）

// 奶龙渲染框左上角坐标（对应桌面版窗口位置）
const pos = { x: 0, y: 0 };

// 点击计数：记录最近点击时间戳，检测 1.5 秒内连击
const clicks = [];

// 大笑音效延迟播放登记
let laughSoundPending = false, laughSoundAt = 0;

// 拖动相关：按住标志 / 是否发生有效位移 / 按下点 / 鼠标相对渲染框偏移
let dragging = false, dragged = false;
let pressPos = { x: 0, y: 0 }, dragOff = { x: 0, y: 0 };
// 甩动轨迹：保留最近 200ms 的位置时间戳，松手时计算初速度
const posHistory = [];

/* ============================================================
 * Animation —— 帧动画播放器
 * 从 ../assets/<name>/<name>_NN.png 加载连续编号帧，12fps 播放。
 * 任意一帧加载失败则整组丢弃（loaded=false），渲染时回退占位色块，
 * 与桌面版「加载失败回退彩色圆形」的行为一致。
 * ============================================================ */
class Animation {
  constructor(key, def) {
    this.key = key;
    this.count = def.count;
    this.loop = def.loop;
    this.frames = [];          // Image 对象数组
    this.frameIdx = 0;         // 当前帧索引
    this.elapsed = 0;          // 当前帧内累计时间（秒）
    this.loaded = false;
    this.imgEl = $('img-' + key);
    this.lastShown = -1;       // 上次写入 <img> 的帧索引（避免重复写 src）
  }

  reset() { this.frameIdx = 0; this.elapsed = 0; this.lastShown = -1; }

  update(dt) {
    if (!this.loaded) return;
    this.elapsed += dt;
    const dur = 1 / ANIM_FPS;
    while (this.elapsed >= dur) {
      this.elapsed -= dur;
      if (this.frameIdx + 1 < this.frames.length) this.frameIdx++;
      else if (this.loop) this.frameIdx = 0;
      // loop=false 且已到末帧：保持停在最后一帧
    }
  }

  // 把当前帧写入对应 <img>（只在帧变化时写，走浏览器缓存，无闪烁）
  show() {
    if (!this.loaded || this.lastShown === this.frameIdx) return;
    this.lastShown = this.frameIdx;
    this.imgEl.src = this.frames[this.frameIdx].src;
  }
}

const anims = {}; // idle / smile / laugh / cry

function loadImage(src) {
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

// 并发预加载全部素材，onProgress(done, total) 驱动进度条
async function preloadAll(onProgress) {
  const entries = Object.entries(ANIM_DEFS);
  const total = entries.reduce((s, [, d]) => s + d.count, 0);
  let done = 0;
  await Promise.all(entries.map(async ([key, def]) => {
    const anim = new Animation(key, def);
    anims[key] = anim;
    anim.frames.length = def.count;
    const queue = [];
    for (let i = 1; i <= def.count; i++) queue.push(i);
    // 每套动画内部 4 路并发，四套并行
    const worker = async () => {
      while (queue.length) {
        const n = queue.shift();
        anim.frames[n - 1] = await loadImage(
          `${ASSET_ROOT}/${key}/${key}_${String(n).padStart(2, '0')}.png`);
        done++;
        onProgress(done, total);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    anim.loaded = anim.frames.every(Boolean); // 任意一帧失败 → 整组丢弃
  }));
}

/* ============================================================
 * Squish —— 碰撞挤压动画（与桌面版逐段对齐）
 *   压缩阶段 100ms：沿碰撞方向压扁，垂直方向拉伸
 *   复原阶段 150ms：缓慢弹回原始比例
 * 撞上/下边缘：Y 轴压缩（变扁，幅度 0.4）
 * 撞左/右边缘：X 轴压缩（变窄，幅度 0.2）
 * ============================================================ */
const squish = {
  phase: 'none',            // none / compress / restore
  t0: 0,
  vertical: false,
  trigger(isVert, now) {
    this.phase = 'compress';
    this.t0 = now;
    this.vertical = isVert;
  },
  reset() { this.phase = 'none'; },
  isActive() { return this.phase !== 'none'; },
  scale(now) {
    if (this.phase === 'none') return { sx: 1, sy: 1 };
    const amt = this.vertical ? 0.4 : 0.2;
    const elapsed = now - this.t0;
    let sq, ex;
    if (this.phase === 'compress') {
      const t = Math.min(elapsed / SQUISH_COMPRESS_MS, 1);
      sq = 1 - amt * t;
      ex = 1 + amt * t;
      if (t >= 1) { this.phase = 'restore'; this.t0 = now; }
    } else {
      const t = Math.min(elapsed / SQUISH_RESTORE_MS, 1);
      sq = (1 - amt) + amt * t;
      ex = (1 + amt) - amt * t;
      if (t >= 1) { this.phase = 'none'; return { sx: 1, sy: 1 }; }
    }
    return this.vertical ? { sx: ex, sy: sq } : { sx: sq, sy: ex };
  },
};

/* ============================================================
 * Physics —— 物理飞行系统（与桌面版 Physics 结构体对齐）
 *   重力：vel.y 每步 +0.4；空气阻力：每步 ×0.98
 *   边缘反弹：速度反向并保留 70% 能量，同时触发挤压动画
 *   停止条件：速度归零且挤压动画结束后退出飞行状态
 * 以固定步长（60Hz）积分，保证不同刷新率下手感一致。
 * ============================================================ */
const phys = {
  vel: { x: 0, y: 0 },
  active: false,
  acc: 0, // 固定步长累加器（ms）
  launch(vx, vy) { this.vel.x = vx; this.vel.y = vy; this.active = true; squish.reset(); },
  stop() { this.active = false; this.vel.x = 0; this.vel.y = 0; squish.reset(); },
  step(now) {
    this.vel.y += PHYS.GRAVITY;
    this.vel.x *= PHYS.DRAG;
    this.vel.y *= PHYS.DRAG;

    const vw = window.innerWidth, vh = window.innerHeight;
    // 与桌面版一致：位移按整数像素累加（static_cast<int> 截断）。
    // 静止时微小速度（<1px/帧）不再产生位移，避免贴地/贴墙时
    // 每帧重复触发边缘碰撞与挤压动画导致无法收敛停止。
    let nx = pos.x + Math.trunc(this.vel.x);
    let ny = pos.y + Math.trunc(this.vel.y);

    // ---- 边缘碰撞：以奶龙身体矩形为基准（非渲染框） ----
    // 左边：身体左边触屏左 → pos.x = -bodyBox.offL
    if (nx < -bodyBox.offL) {
      nx = -bodyBox.offL;
      this.vel.x = Math.abs(this.vel.x) < 3 ? 0 : Math.abs(this.vel.x) * PHYS.BOUNCE;
      squish.trigger(false, now);
    } else if (nx > vw - rendW + bodyOffR) {
      // 右边：身体右边触屏右
      nx = vw - rendW + bodyOffR;
      this.vel.x = Math.abs(this.vel.x) < 3 ? 0 : -Math.abs(this.vel.x) * PHYS.BOUNCE;
      squish.trigger(false, now);
    }

    if (ny < -bodyBox.offT) {
      ny = -bodyBox.offT;
      this.vel.y = Math.abs(this.vel.y) < 3 ? 0 : Math.abs(this.vel.y) * PHYS.BOUNCE;
      squish.trigger(true, now);
    } else if (ny > vh - rendH + bodyOffB) {
      ny = vh - rendH + bodyOffB;
      this.vel.y = Math.abs(this.vel.y) < 3 ? 0 : -Math.abs(this.vel.y) * PHYS.BOUNCE;
      squish.trigger(true, now);
    }

    // 全局速度兜底：贴近屏幕底部且速度极低时停止，防止顶点悬停误判
    const nearBottom = ny >= vh - rendH + bodyOffB - 5;
    if (Math.hypot(this.vel.x, this.vel.y) < 1 && nearBottom) {
      this.vel.x = 0;
      this.vel.y = 0;
    }

    pos.x = nx;
    pos.y = ny;

    // 停止条件：速度完全为零 且 挤压动画已结束
    if (this.vel.x === 0 && this.vel.y === 0 && !squish.isActive())
      this.active = false;
  },
};

/* ============================================================
 * SystemMonitor —— 过载监控器（桌面版的网页版替代实现）
 * 桌面版读取真实 CPU/内存；浏览器沙箱拿不到，改为：
 *   1. 长任务监测：PerformanceObserver 统计 50ms 以上的长任务，
 *      若其占最近采样窗口（2 秒）时长超过 40%，说明主线程被持续
 *      重负载占满 —— 与「CPU 过载」语义等价，且不会把低刷新率 /
 *      省电模式 / 软件渲染等「均匀慢」误判为过载；
 *   2. JS 堆占用：Chrome 系可读 performance.memory，>80% 视为过载
 *      （对应桌面版「内存 >80%」）；
 *   3. 实测帧率仅作为菜单信息展示，不参与判定；
 *   4. 「模拟系统过载」演示开关：强制过载，方便展示哭泣动画。
 * ============================================================ */
const sysmon = {
  fps: 60,              // 实测帧率（信息展示用）
  heapPct: null,        // JS 堆占用百分比；null = 当前浏览器不可读
  longTaskBusy: false,  // 最近窗口长任务占比是否过载
  frames: 0,
  lastSample: performance.now(),
  longTaskMs: 0,        // 当前窗口内长任务累计耗时（ms）
  observer: null,
  initLongTasks() {
    try {
      this.observer = new PerformanceObserver(list => {
        for (const e of list.getEntries()) this.longTaskMs += e.duration;
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (e) { /* 不支持 longtask 的浏览器：跳过该信号，不误报 */ }
  },
  sample(now) {
    this.frames++;
    const el = now - this.lastSample;
    if (el >= SYS_SAMPLE_MS) {
      this.fps = this.frames * 1000 / el;
      this.frames = 0;
      this.lastSample = now;
      this.longTaskBusy = this.longTaskMs / el > LONGTASK_BUSY; // 长任务占比超阈 → 过载
      this.longTaskMs = 0;
      if (performance.memory) { // 仅 Chrome 系可用
        this.heapPct = performance.memory.usedJSHeapSize /
                       performance.memory.jsHeapSizeLimit * 100;
      }
    }
  },
  isBusy() {
    return simulateOverload || this.longTaskBusy ||
           (this.heapPct !== null && this.heapPct > HEAP_BUSY);
  },
};

/* ============================================================
 * 音效系统：优先播放真实 MP3；浏览器不支持时静默降级
 * （桌面版还有正弦波回退，网页端 Audio 不可用时仅跳过播放）
 * ============================================================ */
const sfx = {
  smile: new Audio(`${ASSET_ROOT}/sounds/smile.mp3`),
  laugh: new Audio(`${ASSET_ROOT}/sounds/laugh.mp3`),
};
function playSound(key) {
  const a = sfx[key];
  a.pause();
  a.currentTime = 0;
  a.play().catch(() => {}); // 自动播放策略拦截时静默忽略
}

/* ============================================================
 * IP 属地查询（对应桌面版 WinHTTP 请求 ip-api.com）
 * 网页端受 CORS 限制，改用两个支持 HTTPS + CORS 的公开源依次尝试，
 * 全部失败时显示 unknown，不阻塞任何交互。
 * ============================================================ */
let ipLocation = 'loading...';
let ipReady = false;

async function fetchIpLocation() {
  ipLocation = 'loading...';
  ipReady = false;
  const sources = [
    { url: 'https://ipwho.is/',      pick: j => [j.region, j.city] },
    { url: 'https://ipapi.co/json/', pick: j => [j.region, j.city] },
  ];
  for (const s of sources) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(s.url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const j = await r.json();
      const parts = (s.pick(j) || []).filter(Boolean);
      if (parts.length) { ipLocation = parts.join(', '); ipReady = true; return; }
    } catch (e) { /* 尝试下一个源 */ }
  }
  ipLocation = 'unknown';
  ipReady = true;
}

/* ============================================================
 * 陪伴时长（对应桌面版 nailong_time.txt 跨会话持久化）
 * localStorage 记录历史累计分钟数；每 30 秒及页面隐藏/卸载时写回。
 * ============================================================ */
let baseMinutes = 0;
try { baseMinutes = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0; } catch (e) {}

function totalMinutes(now) {
  return baseMinutes + Math.floor((now - startTime) / 60000);
}
function persistCompanion(now) {
  try { localStorage.setItem(LS_KEY, String(totalMinutes(now))); } catch (e) {}
}

/* ============================================================
 * 打招呼气泡（对应桌面版 GreetBubble）
 * 启动 / 页面重新可见时显示 20 秒；IP 查询完成后原地刷新最后一行。
 * ============================================================ */
const greet = { active: false, hideAt: 0, lines: [], ipUpdated: false };

// 根据当前小时返回英文问候语（与桌面版一致：6-12 早 / 12-18 午 / 其余晚）
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Good morning!';
  if (h >= 12 && h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

// 返回 "Today: YYYY/MM/DD Weekday"（与桌面版一致，全英文）
function getDateStr() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const p = n => String(n).padStart(2, '0');
  return `Today: ${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${days[d.getDay()]}`;
}

function buildGreetLines(now) {
  return [
    getGreeting(),
    getDateStr(),
    `Companion time: ${totalMinutes(now)} mins`,
    `Location: ${ipLocation}`,
  ];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderGreetLines() {
  greetEl.innerHTML = greet.lines.map(l => `<div class="ln">${escapeHtml(l)}</div>`).join('');
}

function showGreet(now) {
  greet.active = true;
  greet.hideAt = now + GREET_MS;
  greet.lines = buildGreetLines(now);
  greet.ipUpdated = ipReady;
  renderGreetLines();
}

function updateGreet(now) {
  if (!greet.active) return;
  if (now >= greet.hideAt) { greet.active = false; return; }
  if (!greet.ipUpdated && ipReady) {
    greet.lines[3] = `Location: ${ipLocation}`;
    greet.ipUpdated = true;
    renderGreetLines();
  }
}

/* ============================================================
 * 气泡定位：跟随奶龙，底边对齐到身体顶部上方 10px（与桌面版一致）
 * ============================================================ */
function placeBubble(el, w) {
  const h = el.offsetHeight;
  const bx = Math.min(Math.max(pos.x + rendW / 2 - w / 2, 8),
                      window.innerWidth - w - 8);
  const by = Math.max(pos.y + bodyBox.offT - 10 - h, 8);
  el.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
}

/* ============================================================
 * 右键菜单（对应桌面版 TrackPopupMenu 原生菜单）
 * 菜单打开期间暂停物理推进（原生菜单是模态的，行为对齐）。
 * ============================================================ */
function buildMenu() {
  const now = performance.now();
  const heapTxt = sysmon.heapPct !== null ? ` · 内存: ${Math.round(sysmon.heapPct)}%` : '';
  const ipTxt = !ipReady ? 'IP属地：查询中...'
    : ipLocation === 'unknown' ? 'IP属地：未知'
    : `IP属地：${ipLocation}`;
  const items = [
    { info: `FPS: ${Math.round(sysmon.fps)}${heapTxt}` },
    { info: `奶龙已陪伴你 ${totalMinutes(now)} 分钟` },
    { info: ipTxt },
    { sep: true },
    { label: '关闭', action: 'close' },
    { label: '最小化到托盘', action: 'tray' },
    { sep: true },
    { label: isPinned ? '取消固定' : '固定', action: 'pin' },
    { label: laughDisabled ? '取消禁用Laughing' : '禁用Laughing', action: 'laughToggle' },
    { label: isMuted ? '取消静音' : '静音', action: 'mute' },
    { sep: true },
    { label: simulateOverload ? '停止模拟过载' : '模拟系统过载（演示）', action: 'simulate' },
    { label: '刷新至正常状态', action: 'refresh' },
  ];
  menuEl.innerHTML = items.map(it =>
    it.sep ? '<div class="sep"></div>'
    : it.info ? `<div class="mi info">${escapeHtml(it.info)}</div>`
    : `<div class="mi act" data-action="${it.action}">${escapeHtml(it.label)}</div>`
  ).join('');
  menuEl.querySelectorAll('.mi.act').forEach(el =>
    el.addEventListener('click', () => menuAction(el.dataset.action)));
}

function openMenu(x, y) {
  buildMenu();
  menuEl.hidden = false;
  menuOpen = true;
  const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
  const mx = Math.min(Math.max(8, x), window.innerWidth - mw - 8);
  const my = Math.min(Math.max(8, y), window.innerHeight - mh - 8);
  menuEl.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menuEl.hidden = true;
}

// 「刷新至正常状态」：重置所有临时状态，不影响开关类设置，之后 30 秒屏蔽检测
function refreshToNormal(now) {
  state = State.Normal;
  stateEnd = 0;
  tired = false;
  startTime = now;             // 重置疲惫倒计时起点
  clicks.length = 0;           // 清空连击计数
  greet.active = false;        // 关闭打招呼气泡
  forceNormal = true;
  forceNormalUntil = now + FORCE_NORMAL_MS;
}

function menuAction(action) {
  closeMenu();
  const now = performance.now();
  switch (action) {
    case 'close': closePet(); break;
    case 'tray': minimizeToTray(); break;
    case 'pin': isPinned = !isPinned; break;
    case 'laughToggle': laughDisabled = !laughDisabled; break;
    case 'mute':
      isMuted = !isMuted;
      if (isMuted) { // 静音同时停掉在播/待播音效
        sfx.smile.pause();
        sfx.laugh.pause();
        laughSoundPending = false;
      }
      break;
    case 'simulate': simulateOverload = !simulateOverload; break;
    case 'refresh': refreshToNormal(now); break;
  }
}

/* ============================================================
 * 关闭 / 下班 与 最小化 / 托盘
 * 关闭：停止主循环、保存陪伴时长、展示「下班」卡片（可随时召回）
 * 最小化：隐藏奶龙，显示右下角悬浮按钮，计时继续（与托盘行为一致）
 * ============================================================ */
let rafId = 0;

function closePet() {
  if (closed) return;
  closed = true;
  persistCompanion(performance.now());
  cancelAnimationFrame(rafId);
  petEl.style.display = 'none';
  greetEl.hidden = true;
  tiredEl.hidden = true;
  trayBtn.hidden = true;
  closeMenu();
  closedOverlay.hidden = false;
}

function revivePet() {
  if (!closed) return;
  closed = false;
  closedOverlay.hidden = true;
  // 与「重启程序」等价：收编本次会话时长作为新基数，重置疲惫状态，重新打招呼
  baseMinutes = totalMinutes(performance.now());
  startTime = performance.now();
  tired = false;
  forceNormal = false;
  state = State.Normal;
  phys.stop();
  clicks.length = 0;
  petEl.style.display = '';
  showGreet(startTime);
  prevT = performance.now();
  rafId = requestAnimationFrame(loop);
}

function minimizeToTray() {
  minimized = true;
  petEl.style.display = 'none';
  greetEl.hidden = true;
  tiredEl.hidden = true;
  trayBtn.hidden = false;
}

function restoreFromTray() {
  minimized = false;
  trayBtn.hidden = true;
  petEl.style.display = '';
}

/* ============================================================
 * 指针交互：点击 / 连点 / 拖动 / 甩动判定（与桌面版事件逻辑对齐）
 * 时间戳统一取 e.timeStamp（与 performance.now() 同一时基）。
 * ============================================================ */
function onPointerDown(e) {
  if (e.button !== 0 || !e.isPrimary) return;
  e.preventDefault();
  phys.stop();                 // 允许用户抓住正在飞的奶龙
  dragging = true;
  dragged = false;
  posHistory.length = 0;
  pressPos = { x: e.clientX, y: e.clientY };
  dragOff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  try { petEl.setPointerCapture(e.pointerId); } catch (err) {}
}

function onPointerMove(e) {
  if (!dragging || !e.isPrimary) return;
  if (isPinned) return;        // 固定时窗口不移动，dragged 不置 true，仍可判定为点击
  const t = e.timeStamp;
  const cur = { x: e.clientX, y: e.clientY };
  // 位移超过 5px 才判定为拖动（避免手抖误判）
  if (Math.abs(cur.x - pressPos.x) > 5 || Math.abs(cur.y - pressPos.y) > 5)
    dragged = true;
  pos.x = cur.x - dragOff.x;
  pos.y = cur.y - dragOff.y;
  // 记录轨迹，保留最近 200ms：
  // 早段(200~100ms)判断加速趋势，晚段(100~0ms)计算初速度
  posHistory.push({ x: cur.x, y: cur.y, t });
  while (posHistory.length > 1 && t - posHistory[0].t > 200) posHistory.shift();
}

function onPointerUp(e) {
  if (e.button !== 0 || !e.isPrimary) return;
  // wasClick：按下后没有发生有效位移 → 判定为点击而非拖动
  const wasClick = dragging && !dragged;
  dragging = false;

  // ---- 甩动判定（速度趋势方案，与桌面版完全一致）----
  // 将轨迹分为早段(200~100ms)与晚段(100~0ms)，比较平均速度：
  // 只有「松手前明确加速」才触发甩动，减速/匀速一律视为拖动放置。
  if (!isPinned && dragged && posHistory.length >= 2) {
    const last = posHistory[posHistory.length - 1];
    const refTime = last.t;
    const totalDisp = Math.hypot(last.x - pressPos.x, last.y - pressPos.y);

    let hasEarly = false, hasLate = false;
    let eF, eL, lF, lL; // 早段/晚段的首尾 {x,y,t}
    for (const ps of posHistory) {
      const age = refTime - ps.t;
      if (age > 100 && age <= 200) {
        if (!hasEarly) eF = ps;
        eL = ps;
        hasEarly = true;
      } else if (age >= 0 && age <= 100) {
        if (!hasLate) lF = ps;
        lL = ps;
        hasLate = true;
      }
    }

    // 晚段平均速度（px/s）→ 甩动初速度
    let velLate = { x: 0, y: 0 };
    if (hasLate && lL.t - lF.t > 1) {
      const dt = (lL.t - lF.t) / 1000;
      velLate = { x: (lL.x - lF.x) / dt, y: (lL.y - lF.y) / dt };
    }
    // 早段平均速度（px/s）→ 判断加速趋势
    let velEarly = { x: 0, y: 0 };
    if (hasEarly && eL.t - eF.t > 1) {
      const dt = (eL.t - eF.t) / 1000;
      velEarly = { x: (eL.x - eF.x) / dt, y: (eL.y - eF.y) / dt };
    }

    const speedLate = Math.hypot(velLate.x, velLate.y);
    const speedEarly = Math.hypot(velEarly.x, velEarly.y);
    const trend = speedLate - speedEarly;

    // 晚段比早段快 30px/s 以上、晚段自身够快、总位移够长 → 视为甩出
    if (trend > 30 && speedLate > 150 && totalDisp > 80) {
      // px/s → px/帧（÷60），与桌面版单位一致
      phys.launch(velLate.x / 60, velLate.y / 60);
    }
  }
  posHistory.length = 0; // 松开后清空历史

  // ---- 点击计数（仅判定为点击时执行）----
  // 处于大笑状态或已禁用大笑时忽略点击
  if (wasClick && state !== State.Laugh && !laughDisabled) {
    const now = e.timeStamp;
    clicks.push(now);
    while (clicks.length && now - clicks[0] > RAPID_MS) clicks.shift();

    if (clicks.length >= LAUGH_N) {
      // 连击 5 次 → 大笑：持续 68 帧 × 1/12s ≈ 5667ms，与动画时长严格对齐
      state = State.Laugh;
      stateEnd = now + LAUGH_MS;
      anims.laugh.reset();
      clicks.length = 0;
      if (!isMuted) { // 音效延迟 300ms，与桌面版一致
        laughSoundPending = true;
        laughSoundAt = now + LAUGH_SOUND_DELAY;
      }
    } else {
      // 普通点击 → 微笑：持续 9 帧 × 1/12s = 750ms
      state = State.Smile;
      stateEnd = now + SMILE_MS;
      anims.smile.reset();
      squish.reset(); // 清除残留挤压，防止形变叠加到微笑渲染
      if (!isMuted) playSound('smile');
    }
  }
}

/* ============================================================
 * 渲染：按状态切换动画、施加挤压形变、定位气泡
 * （对应桌面版渲染段的 if/else 链与回退色块）
 * ============================================================ */
const FALLBACK_COLORS = { // 与桌面版回退圆形颜色一致
  idle: '#ff8c00', smile: '#ffdc00', laugh: '#dc3232', cry: '#3264ff',
};

function showAnim(which) {
  for (const k of ['idle', 'smile', 'laugh', 'cry']) {
    const on = k === which && anims[k].loaded;
    anims[k].imgEl.classList.toggle('show', on);
  }
  const a = anims[which];
  if (a.loaded) {
    fallbackEl.style.display = 'none';
    a.show();
  } else {
    fallbackEl.style.display = 'block';
    fallbackEl.style.background = FALLBACK_COLORS[which] || FALLBACK_COLORS.idle;
  }
}

function render(now) {
  if (minimized) return; // 托盘态不更新 DOM（对应隐藏窗口）

  // ---- 状态 → 动画选择（与桌面版渲染链一致）----
  let which = 'idle';
  let sq = { sx: 1, sy: 1 };
  if (phys.active) {
    sq = squish.scale(now);       // 飞行中：idle + 挤压缩放
  } else if (state === State.Smile) {
    which = 'smile';
  } else if (state === State.Laugh) {
    which = 'laugh';
  } else if (state === State.Cry) {
    which = 'cry';
  }
  // Drag / Tired / PreCry / Normal 统一播放 idle

  showAnim(which);
  petEl.style.transform =
    `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${sq.sx}, ${sq.sy})`;
  petEl.classList.toggle('grabbing', dragging && dragged);

  // 疲惫气泡
  const tiredOn = (state === State.Tired);
  tiredEl.hidden = !tiredOn;
  if (tiredOn) placeBubble(tiredEl, 130);

  // 打招呼气泡
  updateGreet(now);
  greetEl.hidden = !greet.active;
  if (greet.active) placeBubble(greetEl, 230);
}

/* ============================================================
 * 主循环：系统采样 → 状态机 → 物理 → 动画 → 渲染
 * 状态优先级（与桌面版一致，从高到低）：
 *   飞行/弹跳 > 拖动 > 点击(微笑/大笑) > PreCry > 疲惫 > 哭泣 > 正常
 * ============================================================ */
let prevT = performance.now();

function loop(t) {
  rafId = requestAnimationFrame(loop);
  const dtMs = Math.min(t - prevT, 100); // 帧间隔上限 100ms，防止跳帧
  prevT = t;
  const dt = dtMs / 1000;

  sysmon.sample(t); // 内部节流：2 秒最多结算一次

  // forceNormal 到期检查
  if (forceNormal && t >= forceNormalUntil) forceNormal = false;

  // 疲惫检测：连续使用满 60 分钟（forceNormal 期间跳过，避免计时被"偷走"）
  if (!tired && !forceNormal && t - startTime >= TIRED_MS) tired = true;

  // 本帧过载结果（forceNormal 期间视为 false，阻止 Cry/PreCry 触发）
  const curBusy = !forceNormal && sysmon.isBusy();

  // 基础状态：高优先级状态结束后的回落目标（疲惫 > 哭泣 > 正常）
  const baseState = (!forceNormal && tired) ? State.Tired
                  : curBusy ? State.Cry
                  : State.Normal;

  // ---- 状态优先级判定 ----
  if (phys.active) {
    // 飞行：固定步长推进物理（菜单打开期间暂停，对应原生菜单的模态行为）
    if (!menuOpen) {
      phys.acc = Math.min(phys.acc + dtMs, 200);
      let steps = 0;
      while (phys.acc >= PHYS.STEP_MS && steps < 4) {
        phys.step(t);
        phys.acc -= PHYS.STEP_MS;
        steps++;
        if (!phys.active) break;
      }
      if (!phys.active) state = baseState; // 同帧完成状态转换，避免闪烁
    }
  } else if (dragging && dragged) {
    state = State.Drag;
  } else if (state === State.Drag) {
    state = baseState; // 拖动刚结束：回落
  } else if (state === State.Smile || state === State.Laugh) {
    if (t >= stateEnd) state = baseState; // 点击状态计时到期：回落
  } else if (state === State.PreCry) {
    if (t - preCryStart >= PRECRY_MS) state = State.Cry; // 过渡 1 秒后进入哭泣
  } else {
    // 检测过载上升沿（false→true）：非疲惫且非强制正常时触发 PreCry
    if (!prevBusy && curBusy && !tired && !forceNormal) {
      state = State.PreCry;
      preCryStart = t;
    } else {
      state = baseState;
    }
  }
  prevBusy = curBusy;

  // laugh 音效延迟触发：到达预定时间点才播放
  if (laughSoundPending && t >= laughSoundAt) {
    laughSoundPending = false;
    playSound('laugh');
  }

  // 四套动画各自独立推进帧（即使不显示也保持推进，与桌面版一致）
  for (const k of ['idle', 'smile', 'laugh', 'cry']) anims[k].update(dt);

  render(t);
}

/* ============================================================
 * 事件绑定
 * ============================================================ */
petEl.addEventListener('pointerdown', onPointerDown);
petEl.addEventListener('pointermove', onPointerMove);
petEl.addEventListener('pointerup', onPointerUp);
petEl.addEventListener('pointercancel', onPointerUp);
petEl.addEventListener('contextmenu', e => {
  // 屏蔽浏览器默认菜单，改用自定义菜单
  // （部分移动端长按也会触发 contextmenu，行为保持一致）
  e.preventDefault();
  openMenu(e.clientX, e.clientY);
});

document.addEventListener('pointerdown', e => {
  if (menuOpen && !menuEl.contains(e.target)) closeMenu();
}, true);

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (menuOpen) { closeMenu(); return; }   // 先关菜单
  if (closed) { revivePet(); return; }     // 下班态再按 Esc 召回
  if (!minimized) closePet();              // 对应桌面版 Escape 退出
});

trayBtn.addEventListener('click', restoreFromTray);
reviveBtn.addEventListener('click', revivePet);

// 窗口尺寸变化：把奶龙拉回可视区域
window.addEventListener('resize', () => {
  pos.x = Math.min(Math.max(pos.x, -bodyBox.offL), window.innerWidth - rendW + bodyOffR);
  pos.y = Math.min(Math.max(pos.y, -bodyBox.offT), window.innerHeight - rendH + bodyOffB);
});

// 页面重新可见 ≈ 桌面版「电脑唤醒」：重新查询 IP（可能换了网络）+ 重新打招呼；
// 若当时最小化在托盘，则一并恢复显示（与桌面版唤醒行为一致）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    persistCompanion(performance.now());
    return;
  }
  if (closed) return;
  if (minimized) restoreFromTray();
  fetchIpLocation();
  showGreet(performance.now());
});

// 陪伴时长持久化：每 30 秒 + 页面卸载时写回
setInterval(() => persistCompanion(performance.now()), 30000);
window.addEventListener('pagehide', () => persistCompanion(performance.now()));

/* ============================================================
 * 启动流程：预加载素材（进度条）→ 落位 → 打招呼 → 进入主循环
 * ============================================================ */
async function init() {
  // 写入渲染框精确尺寸（宽 180px，高按素材宽高比）
  petEl.style.width = rendW + 'px';
  petEl.style.height = rendH + 'px';

  // 启动长任务监测（不支持 PerformanceObserver longtask 的浏览器自动跳过）
  sysmon.initLongTasks();

  await preloadAll((done, total) => {
    loadFill.style.width = (done / total * 100).toFixed(1) + '%';
    loadTxt.textContent = `正在加载奶龙素材… ${done} / ${total}`;
  });

  // 初始位置：水平居中、贴近底部（桌宠自然落座）
  pos.x = (window.innerWidth - rendW) / 2;
  pos.y = window.innerHeight - rendH - 40;
  if (pos.y < 8) pos.y = (window.innerHeight - rendH) / 2; // 矮屏兜底

  loadingEl.classList.add('done');
  setTimeout(() => loadingEl.remove(), 600);

  // 启动 IP 查询（异步，不阻塞）
  fetchIpLocation();

  // 启动打招呼气泡
  showGreet(performance.now());

  // 操作提示 12 秒后自动淡出
  setTimeout(() => hintEl.classList.add('gone'), 12000);

  // 进入主循环
  prevT = performance.now();
  rafId = requestAnimationFrame(loop);
}

init();
