"use client";

import * as React from "react";

/* ============================================================
 * 像素排序变换 — 直接移植自 https://pixel-sort-morph.netlify.app
 *
 * 算法核心：
 *   1. 把 A、B 两张图都按某指标（明度/饱和度/色相/RGB）排序
 *   2. A 中第 i 个像素（按指标排名）→ 移动到 B 中第 i 个像素的位置
 *   3. 用 easeInOutCubic 在指定时长内逐帧插值绘制
 *   4. 可选拖尾效果（每帧 decay=0.98 衰减到背景）+ 图 A 作背景
 * ============================================================ */

const DEFAULT_SRC = "/demo/idle_40.png"; // 奶龙默认状态
const DEFAULT_DST = "/demo/laugh_10.png"; // 奶龙大笑状态

type SortMethod = "luminance" | "saturation" | "hue" | "red" | "green" | "blue";

interface Pixel {
  r: number;
  g: number;
  b: number;
  x: number;
  y: number;
  key: number;
}
interface SortedPixel {
  r: number;
  g: number;
  b: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

function sortKey(r: number, g: number, b: number, method: SortMethod) {
  switch (method) {
    case "luminance":
      return 0.299 * r + 0.587 * g + 0.114 * b;
    case "saturation": {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return max === 0 ? 0 : (max - min) / max;
    }
    case "hue": {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      if (max === r) return ((g - b) / d + (g < b ? 6 : 0)) / 6;
      if (max === g) return ((b - r) / d + 2) / 6;
      return ((r - g) / d + 4) / 6;
    }
    case "red":
      return r;
    case "green":
      return g;
    case "blue":
      return b;
    default:
      return 0.299 * r + 0.587 * g + 0.114 * b;
  }
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

function cropAndResize(img: HTMLImageElement, size: number): ImageData {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const octx = c.getContext("2d", { willReadFrequently: true })!;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const imgAspect = iw / ih;
  let sx, sy, sw, sh;
  if (imgAspect > 1) {
    sh = ih;
    sw = ih;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = iw;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  octx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return octx.getImageData(0, 0, size, size);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getDisplaySize() {
  if (typeof window === "undefined") return 400;
  const isMobile = window.innerWidth <= 850;
  if (isMobile) {
    return Math.min(window.innerWidth - 20, window.innerHeight - 270, 500);
  }
  return Math.min(580, window.innerWidth - 300, window.innerHeight - 280);
}

export function PixelTransformDemo() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);

  // 上传 UI 状态
  const [thumbA, setThumbA] = React.useState<string | null>(null);
  const [thumbB, setThumbB] = React.useState<string | null>(null);
  const [infoA, setInfoA] = React.useState("");
  const [infoB, setInfoB] = React.useState("");
  const fileARef = React.useRef<HTMLInputElement>(null);
  const fileBRef = React.useRef<HTMLInputElement>(null);

  // 控件状态
  const [resolution, setResolution] = React.useState(120);
  const [sortMethod, setSortMethod] = React.useState<SortMethod>("luminance");
  const [duration, setDuration] = React.useState(2500);
  const [trailOn, setTrailOn] = React.useState(false);
  const [bgImgAOn, setBgImgAOn] = React.useState(false);

  // 运行时状态
  const [status, setStatus] = React.useState("正在加载默认图片...");
  const [statusKind, setStatusKind] = React.useState<"idle" | "ready" | "animating">("idle");

  // 持久状态（不触发重渲染）
  const originalImgARef = React.useRef<HTMLImageElement | null>(null);
  const originalImgBRef = React.useRef<HTMLImageElement | null>(null);
  const imageADataRef = React.useRef<ImageData | null>(null);
  const imageBDataRef = React.useRef<ImageData | null>(null);
  const sortedARef = React.useRef<SortedPixel[] | null>(null);
  const animationIdRef = React.useRef<number | null>(null);
  const isAnimatingRef = React.useRef(false);
  const trailBufferRef = React.useRef<ImageData | null>(null);
  // 用 ref 同步当前的控件值给动画循环
  const trailOnRef = React.useRef(trailOn);
  const bgImgAOnRef = React.useRef(bgImgAOn);
  React.useEffect(() => {
    trailOnRef.current = trailOn;
  }, [trailOn]);
  React.useEffect(() => {
    bgImgAOnRef.current = bgImgAOn;
  }, [bgImgAOn]);

  // === 处理图片：排序后构建 sortedA ===
  function processImages() {
    if (!imageADataRef.current || !imageBDataRef.current) return;
    const size = imageADataRef.current.width;

    function extract(imageData: ImageData): Pixel[] {
      const d = imageData.data;
      const pixels: Pixel[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          pixels.push({
            r: d[i],
            g: d[i + 1],
            b: d[i + 2],
            x,
            y,
            key: sortKey(d[i], d[i + 1], d[i + 2], sortMethod),
          });
        }
      }
      return pixels;
    }

    const pixelsA = extract(imageADataRef.current);
    const pixelsB = extract(imageBDataRef.current);
    pixelsA.sort((a, b) => a.key - b.key);
    pixelsB.sort((a, b) => a.key - b.key);

    const arr: SortedPixel[] = new Array(size * size);
    for (let i = 0; i < pixelsA.length; i++) {
      arr[i] = {
        r: pixelsA[i].r,
        g: pixelsA[i].g,
        b: pixelsA[i].b,
        sx: pixelsA[i].x,
        sy: pixelsA[i].y,
        tx: pixelsB[i].x,
        ty: pixelsB[i].y,
      };
    }
    sortedARef.current = arr;
  }

  // === 设置画布尺寸 ===
  function setCanvasSize(size: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ds = getDisplaySize();
    canvas.style.width = ds + "px";
    canvas.style.height = ds + "px";
  }

  // === 渲染初始 A ===
  function renderImageA() {
    if (!imageADataRef.current) return;
    const size = imageADataRef.current.width;
    setCanvasSize(size);
    const ctx = ctxRef.current!;
    ctx.putImageData(imageADataRef.current, 0, 0);
  }

  // === 渲染动画帧 ===
  function renderFrame(progress: number) {
    if (!sortedARef.current || !imageADataRef.current) return;
    const size = imageADataRef.current.width;
    setCanvasSize(size);
    const ctx = ctxRef.current!;

    if (!trailOnRef.current) {
      // 无拖尾：每帧重画
      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;
      if (bgImgAOnRef.current && imageADataRef.current) {
        const src = imageADataRef.current.data;
        for (let i = 0; i < data.length; i++) data[i] = src[i];
      } else {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 10;
          data[i + 1] = 8;
          data[i + 2] = 20;
          data[i + 3] = 255;
        }
      }
      const sorted = sortedARef.current;
      for (let p = 0; p < sorted.length; p++) {
        const px = sorted[p];
        const cx = px.sx + (px.tx - px.sx) * progress;
        const cy = px.sy + (px.ty - px.sy) * progress;
        const ix = Math.round(cx);
        const iy = Math.round(cy);
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
          const idx = (iy * size + ix) * 4;
          data[idx] = px.r;
          data[idx + 1] = px.g;
          data[idx + 2] = px.b;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      // 拖尾效果：累积帧
      if (
        !trailBufferRef.current ||
        trailBufferRef.current.width !== size
      ) {
        trailBufferRef.current = ctx.createImageData(size, size);
        initTrailBuffer(size);
      }
      const buf = trailBufferRef.current.data;
      const decay = 0.98;
      if (bgImgAOnRef.current && imageADataRef.current) {
        const src = imageADataRef.current.data;
        for (let i = 0; i < buf.length; i += 4) {
          buf[i] = buf[i] * decay + src[i] * (1 - decay);
          buf[i + 1] = buf[i + 1] * decay + src[i + 1] * (1 - decay);
          buf[i + 2] = buf[i + 2] * decay + src[i + 2] * (1 - decay);
          buf[i + 3] = 255;
        }
      } else {
        for (let i = 0; i < buf.length; i += 4) {
          buf[i] *= decay;
          buf[i + 1] *= decay;
          buf[i + 2] *= decay;
          buf[i + 3] = 255;
        }
      }
      const sorted = sortedARef.current;
      for (let p = 0; p < sorted.length; p++) {
        const px = sorted[p];
        const cx = px.sx + (px.tx - px.sx) * progress;
        const cy = px.sy + (px.ty - px.sy) * progress;
        const ix = Math.round(cx);
        const iy = Math.round(cy);
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
          const idx = (iy * size + ix) * 4;
          buf[idx] = px.r;
          buf[idx + 1] = px.g;
          buf[idx + 2] = px.b;
          buf[idx + 3] = 255;
        }
      }
      ctx.putImageData(trailBufferRef.current, 0, 0);
    }
  }

  function initTrailBuffer(size: number) {
    const buf = trailBufferRef.current!.data;
    if (bgImgAOnRef.current && imageADataRef.current) {
      const src = imageADataRef.current.data;
      for (let i = 0; i < buf.length; i++) buf[i] = src[i];
    } else {
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = 10;
        buf[i + 1] = 8;
        buf[i + 2] = 20;
        buf[i + 3] = 255;
      }
    }
  }

  // === 动画 ===
  function startAnimation() {
    if (isAnimatingRef.current || !sortedARef.current) return;
    isAnimatingRef.current = true;
    trailBufferRef.current = null;
    setStatus("变换中...");
    setStatusKind("animating");

    const startTime = performance.now();
    const dur = duration;

    function frame(now: number) {
      const elapsed = now - startTime;
      const raw = Math.min(elapsed / dur, 1);
      renderFrame(easeInOutCubic(raw));
      if (raw < 1) {
        animationIdRef.current = requestAnimationFrame(frame);
      } else {
        isAnimatingRef.current = false;
        animationIdRef.current = null;
        trailBufferRef.current = null;
        setStatus('变换完成！用图片 A 的像素拼出了图片 B 的结构');
        setStatusKind("ready");
      }
    }
    animationIdRef.current = requestAnimationFrame(frame);
  }

  function resetToA() {
    if (isAnimatingRef.current) {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      isAnimatingRef.current = false;
      animationIdRef.current = null;
    }
    trailBufferRef.current = null;
    renderImageA();
    setStatus('已重置 — 点击"开始变换"查看动画');
    setStatusKind("ready");
  }

  function onBothReady() {
    processImages();
    renderImageA();
    setStatus('准备就绪 — 点击"开始变换"查看动画');
    setStatusKind("ready");
  }

  // === 加载图片处理 ===
  async function handleFile(file: File, side: "A" | "B") {
    if (side === "A") setInfoA("加载中...");
    else setInfoB("加载中...");
    try {
      const img = await fileToImage(file);
      if (side === "A") originalImgARef.current = img;
      else originalImgBRef.current = img;

      // 缩略图
      const reader = new FileReader();
      reader.onload = (e) => {
        if (side === "A") setThumbA(e.target?.result as string);
        else setThumbB(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const size = resolution;
      const imageData = cropAndResize(img, size);
      if (side === "A") {
        imageADataRef.current = imageData;
        setInfoA(`已处理: ${size}×${size} 像素`);
        if (imageBDataRef.current) onBothReady();
        else {
          setStatus("已加载图片 A — 请上传图片 B");
          setStatusKind("idle");
        }
      } else {
        imageBDataRef.current = imageData;
        setInfoB(`已处理: ${size}×${size} 像素`);
        if (imageADataRef.current) onBothReady();
        else {
          setStatus("已加载图片 B — 请上传图片 A");
          setStatusKind("idle");
        }
      }
    } catch (err: any) {
      if (side === "A") setInfoA("加载失败: " + err.message);
      else setInfoB("加载失败: " + err.message);
    }
  }

  // === 拖放上传 ===
  function createDropHandlers(side: "A" | "B") {
    return {
      onClick: () => (side === "A" ? fileARef : fileBRef).current?.click(),
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f, side);
      },
    };
  }

  // === 重处理两张图（分辨率改变时） ===
  function reprocessBoth() {
    const size = resolution;
    if (originalImgARef.current) {
      imageADataRef.current = cropAndResize(originalImgARef.current, size);
      setInfoA(`已处理: ${size}×${size} 像素`);
    }
    if (originalImgBRef.current) {
      imageBDataRef.current = cropAndResize(originalImgBRef.current, size);
      setInfoB(`已处理: ${size}×${size} 像素`);
    }
    if (imageADataRef.current && imageBDataRef.current) onBothReady();
  }

  // === 初始化：加载默认奶龙图片 ===
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d", { willReadFrequently: true });
    const ctx = ctxRef.current;
    if (!ctx) return;

    // 初始空画布
    setCanvasSize(resolution);
    ctx.fillStyle = "#0a0814";
    ctx.fillRect(0, 0, resolution, resolution);

    (async () => {
      try {
        const [imgA, imgB] = await Promise.all([
          urlToImage(DEFAULT_SRC),
          urlToImage(DEFAULT_DST),
        ]);
        originalImgARef.current = imgA;
        originalImgBRef.current = imgB;
        setThumbA(DEFAULT_SRC);
        setThumbB(DEFAULT_DST);

        const size = resolution;
        imageADataRef.current = cropAndResize(imgA, size);
        imageBDataRef.current = cropAndResize(imgB, size);
        setInfoA(`已处理: ${size}×${size} 像素`);
        setInfoB(`已处理: ${size}×${size} 像素`);
        onBothReady();
      } catch (e: any) {
        setStatus("加载默认图片失败: " + (e?.message ?? e));
        setStatusKind("idle");
      }
    })();
  }, []);

  // 控件变化处理
  function onResolutionChange(v: number) {
    setResolution(v);
    if (isAnimatingRef.current) return;
    reprocessBoth();
  }

  function onSortMethodChange(v: SortMethod) {
    setSortMethod(v);
    if (isAnimatingRef.current) return;
    if (imageADataRef.current && imageBDataRef.current) {
      processImages();
      renderImageA();
      setStatus("排序方式已更新");
      setStatusKind("ready");
    }
  }

  function onTrailToggle() {
    const next = !trailOn;
    setTrailOn(next);
    trailOnRef.current = next;
    trailBufferRef.current = null;
  }

  function onBgImgAToggle() {
    const next = !bgImgAOn;
    setBgImgAOn(next);
    bgImgAOnRef.current = next;
    trailBufferRef.current = null;
  }

  // 窗口尺寸变化时刷新画布显示
  React.useEffect(() => {
    const handler = () => {
      if (imageADataRef.current && !isAnimatingRef.current) {
        setCanvasSize(imageADataRef.current.width);
        ctxRef.current?.putImageData(imageADataRef.current, 0, 0);
      }
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div className="psm-layout">
      {/* 左：上传面板 */}
      <div className="psm-left">
        <div className="psm-upload-panel">
          <h3>图片 A（源）</h3>
          <div
            className={`psm-upload-zone ${thumbA ? "has-image" : ""}`}
            {...createDropHandlers("A")}
          >
            {thumbA ? (
              <img src={thumbA} alt="图片 A" />
            ) : (
              <div className="psm-placeholder">
                <span className="icon">🖼️</span>
                <span>点击或拖拽上传</span>
              </div>
            )}
          </div>
          <label
            className="psm-file-btn"
            onClick={() => fileARef.current?.click()}
          >
            选择图片 A
          </label>
          <input
            ref={fileARef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "A");
            }}
          />
          <div className="psm-info">{infoA}</div>
        </div>

        <div className="psm-upload-panel">
          <h3>图片 B（目标）</h3>
          <div
            className={`psm-upload-zone ${thumbB ? "has-image" : ""}`}
            {...createDropHandlers("B")}
          >
            {thumbB ? (
              <img src={thumbB} alt="图片 B" />
            ) : (
              <div className="psm-placeholder">
                <span className="icon">🖼️</span>
                <span>点击或拖拽上传</span>
              </div>
            )}
          </div>
          <label
            className="psm-file-btn"
            onClick={() => fileBRef.current?.click()}
          >
            选择图片 B
          </label>
          <input
            ref={fileBRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "B");
            }}
          />
          <div className="psm-info">{infoB}</div>
        </div>

        <div className="psm-default-hint">
          默认已加载奶龙 <code>idle_40.png</code> → <code>laugh_10.png</code>，可直接点击"开始变换"，或上传自定义图。
        </div>
      </div>

      {/* 右：画布 + 控件 */}
      <div className="psm-right">
        <div className="psm-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={resolution}
            height={resolution}
            className="psm-canvas"
          />
        </div>
        <div className={`psm-status psm-status-${statusKind}`}>{status}</div>
        <div className="psm-controls">
          <div className="psm-control-group">
            <label>分辨率</label>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={resolution}
              onChange={(e) => onResolutionChange(parseInt(e.target.value))}
            />
            <span className="psm-range-value">
              {resolution}×{resolution}
            </span>
          </div>

          <div className="psm-control-group">
            <label>排序依据</label>
            <select
              value={sortMethod}
              onChange={(e) => onSortMethodChange(e.target.value as SortMethod)}
            >
              <option value="luminance">明度</option>
              <option value="saturation">饱和度</option>
              <option value="hue">色相</option>
              <option value="red">红色通道</option>
              <option value="green">绿色通道</option>
              <option value="blue">蓝色通道</option>
            </select>
          </div>

          <div className="psm-control-group">
            <label>动画时长</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            >
              <option value={1500}>1.5 秒</option>
              <option value={2500}>2.5 秒</option>
              <option value={4000}>4 秒</option>
              <option value={6000}>6 秒</option>
            </select>
          </div>

          <button
            className={`psm-btn psm-btn-toggle ${trailOn ? "active" : ""}`}
            onClick={onTrailToggle}
          >
            ✨ 拖尾效果
          </button>
          <button
            className={`psm-btn psm-btn-toggle ${bgImgAOn ? "active" : ""}`}
            onClick={onBgImgAToggle}
          >
            🖼️ 背景图A
          </button>
          <button
            className="psm-btn psm-btn-transform"
            onClick={startAnimation}
            disabled={isAnimatingRef.current || !sortedARef.current}
          >
            ⟳ 开始变换
          </button>
          <button
            className="psm-btn psm-btn-reset"
            onClick={resetToA}
            disabled={isAnimatingRef.current}
          >
            ↺ 重置
          </button>
        </div>
      </div>
    </div>
  );
}
