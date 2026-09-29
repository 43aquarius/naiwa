"use client";

import * as React from "react";
import { Upload, Download, Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  pixelSort,
  morph,
  glitch,
  imageToBuffer,
  loadImage,
  drawBuffer,
  type RGBABuffer,
  type SortDirection,
  type SortMetric,
} from "@/lib/pixel-utils";

const DEFAULT_SRC = "/demo/idle_40.png"; // 奶龙默认状态
const DEFAULT_DST = "/demo/laugh_10.png"; // 奶龙大笑状态
const MAX_DIM = 400;

type Mode = "sort" | "morph" | "glitch" | "pipeline";

export function PixelTransformDemo() {
  const srcImgRef = React.useRef<HTMLImageElement | null>(null);
  const dstImgRef = React.useRef<HTMLImageElement | null>(null);
  const srcBufRef = React.useRef<RGBABuffer | null>(null);
  const dstBufRef = React.useRef<RGBABuffer | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const srcInputRef = React.useRef<HTMLInputElement>(null);
  const dstInputRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = React.useState<Mode>("morph");
  const [srcUrl, setSrcUrl] = React.useState(DEFAULT_SRC);
  const [dstUrl, setDstUrl] = React.useState(DEFAULT_DST);
  const [srcName, setSrcName] = React.useState("idle_40.png");
  const [dstName, setDstName] = React.useState("laugh_10.png");

  // 排序参数
  const [sortDir, setSortDir] = React.useState<SortDirection>("horizontal");
  const [sortMetric, setSortMetric] = React.useState<SortMetric>("brightness");
  const [sortThreshold, setSortThreshold] = React.useState(128);
  const [sortThresholdMode, setSortThresholdMode] = React.useState<"above" | "below">("above");
  const [sortIntensity, setSortIntensity] = React.useState(0.8);

  // 形变参数
  const [morphAmount, setMorphAmount] = React.useState(0.5);
  const [morphEase, setMorphEase] = React.useState<"linear" | "easeinout">("easeinout");

  // 故障参数
  const [glitchAmount, setGlitchAmount] = React.useState(0.5);
  const [glitchBlocks, setGlitchBlocks] = React.useState(12);
  const [glitchSeed, setGlitchSeed] = React.useState(42);

  // 流水线
  const [pipelineSortFirst, setPipelineSortFirst] = React.useState(true);

  const [autoRun, setAutoRun] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 默认加载
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [src, dst] = await Promise.all([
          loadImage(DEFAULT_SRC),
          loadImage(DEFAULT_DST),
        ]);
        if (cancelled) return;
        srcImgRef.current = src;
        dstImgRef.current = dst;
        srcBufRef.current = imageToBuffer(src, MAX_DIM);
        dstBufRef.current = imageToBuffer(dst, MAX_DIM);
        if (
          srcBufRef.current.width !== dstBufRef.current.width ||
          srcBufRef.current.height !== dstBufRef.current.height
        ) {
          dstBufRef.current = resizeBuffer(
            dstBufRef.current,
            srcBufRef.current.width,
            srcBufRef.current.height
          );
        }
        render();
      } catch (e: any) {
        setError("加载奶龙默认图片失败：" + (e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (autoRun) render();
  }, [
    mode,
    sortDir,
    sortMetric,
    sortThreshold,
    sortThresholdMode,
    sortIntensity,
    morphAmount,
    morphEase,
    glitchAmount,
    glitchBlocks,
    glitchSeed,
    pipelineSortFirst,
    autoRun,
  ]);

  function render() {
    const canvas = canvasRef.current;
    const src = srcBufRef.current;
    const dst = dstBufRef.current;
    if (!canvas || !src) return;
    setRunning(true);
    setError(null);
    try {
      let out: RGBABuffer;
      if (mode === "sort") {
        out = pixelSort(src, {
          direction: sortDir,
          metric: sortMetric,
          threshold: sortThreshold,
          thresholdMode: sortThresholdMode,
          intensity: sortIntensity,
        });
      } else if (mode === "morph") {
        if (!dst) {
          setError("目标图片尚未加载");
          setRunning(false);
          return;
        }
        out = morph(src, dst, { amount: morphAmount, easing: morphEase });
      } else if (mode === "glitch") {
        out = glitch(src, {
          amount: glitchAmount,
          blockCount: glitchBlocks,
          seed: glitchSeed,
        });
      } else {
        if (!dst) {
          setError("目标图片尚未加载");
          setRunning(false);
          return;
        }
        const sorted: RGBABuffer = pixelSort(src, {
          direction: sortDir,
          metric: sortMetric,
          threshold: sortThreshold,
          thresholdMode: sortThresholdMode,
          intensity: sortIntensity,
        });
        const baseForMorph = pipelineSortFirst ? sorted : src;
        const morphed = morph(baseForMorph, dst, {
          amount: morphAmount,
          easing: morphEase,
        });
        out = glitch(morphed, {
          amount: glitchAmount,
          blockCount: glitchBlocks,
          seed: glitchSeed,
        });
      }
      canvas.width = out.width;
      canvas.height = out.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      drawBuffer(ctx, out);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  function onUploadSrc(file: File) {
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setSrcName(file.name);
    loadImage(url)
      .then((img) => {
        srcImgRef.current = img;
        srcBufRef.current = imageToBuffer(img, MAX_DIM);
        if (dstBufRef.current) {
          dstBufRef.current = resizeBuffer(
            imageToBuffer(dstImgRef.current ?? img, MAX_DIM),
            srcBufRef.current.width,
            srcBufRef.current.height
          );
        }
        render();
      })
      .catch((e) => setError("加载源图片失败：" + (e?.message ?? e)));
  }

  function onUploadDst(file: File) {
    const url = URL.createObjectURL(file);
    setDstUrl(url);
    setDstName(file.name);
    loadImage(url)
      .then((img) => {
        dstImgRef.current = img;
        const base = imageToBuffer(img, MAX_DIM);
        if (srcBufRef.current) {
          dstBufRef.current = resizeBuffer(
            base,
            srcBufRef.current.width,
            srcBufRef.current.height
          );
        } else {
          dstBufRef.current = base;
        }
        render();
      })
      .catch((e) => setError("加载目标图片失败：" + (e?.message ?? e)));
  }

  function downloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `像素变换-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function shuffleSeed() {
    setGlitchSeed(Math.floor(Math.random() * 99999));
  }

  return (
    <div className="pml-card p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 画布 */}
        <div className="flex-1">
          <div
            className="relative w-full aspect-square rounded-lg overflow-hidden"
            style={{
              background:
                "repeating-conic-gradient(#e7e2d8 0% 25%, #f3efe9 0% 50%) 50% / 16px 16px",
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{ imageRendering: "auto" }}
            />
            {running && (
              <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-black/70 text-white flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> 处理中
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              onClick={() => render()}
              size="sm"
              style={{
                background: "var(--pml-accent)",
                color: "var(--pml-accent-fg)",
              }}
            >
              <Shuffle className="h-3.5 w-3.5 mr-1.5" /> 重新渲染
            </Button>
            <Button onClick={downloadCanvas} size="sm" variant="outline">
              <Download className="h-3.5 w-3.5 mr-1.5" /> 下载 PNG
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[var(--pml-prose-muted)]">自动运行</span>
              <Switch checked={autoRun} onCheckedChange={setAutoRun} />
            </div>
          </div>
          {error && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* 控件 */}
        <div className="lg:w-[340px] flex flex-col gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="sort">像素排序</TabsTrigger>
              <TabsTrigger value="morph">形变</TabsTrigger>
              <TabsTrigger value="glitch">故障</TabsTrigger>
              <TabsTrigger value="pipeline">流水线</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 图片输入 */}
          <div className="grid grid-cols-2 gap-2">
            <ImageBox
              label="源图"
              name={srcName}
              url={srcUrl}
              onPick={() => srcInputRef.current?.click()}
            />
            <ImageBox
              label="目标图"
              name={dstName}
              url={dstUrl}
              onPick={() => dstInputRef.current?.click()}
            />
            <input
              ref={srcInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadSrc(f);
              }}
            />
            <input
              ref={dstInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadDst(f);
              }}
            />
          </div>
          <p className="text-[11px] text-[var(--pml-prose-muted)] -mt-2">
            默认示例为奶龙 idle_40 → laugh_10，点击上方卡片可上传自定义 PNG / JPG。
          </p>

          {/* 排序控件 */}
          {(mode === "sort" || mode === "pipeline") && (
            <div className="space-y-3 pml-card p-3">
              <SectionLabel>像素排序</SectionLabel>
              <Row>
                <label className="text-xs text-[var(--pml-prose-muted)]">方向</label>
                <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDirection)}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">水平</SelectItem>
                    <SelectItem value="vertical">垂直</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row>
                <label className="text-xs text-[var(--pml-prose-muted)]">指标</label>
                <Select value={sortMetric} onValueChange={(v) => setSortMetric(v as SortMetric)}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brightness">亮度</SelectItem>
                    <SelectItem value="hue">色相</SelectItem>
                    <SelectItem value="saturation">饱和度</SelectItem>
                    <SelectItem value="red">红</SelectItem>
                    <SelectItem value="green">绿</SelectItem>
                    <SelectItem value="blue">蓝</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <SliderRow
                label="阈值"
                value={sortThreshold}
                min={0}
                max={255}
                step={1}
                onChange={setSortThreshold}
              />
              <Row>
                <label className="text-xs text-[var(--pml-prose-muted)]">排序范围</label>
                <Select
                  value={sortThresholdMode}
                  onValueChange={(v) => setSortThresholdMode(v as "above" | "below")}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">高于阈值</SelectItem>
                    <SelectItem value="below">低于阈值</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <SliderRow
                label="强度"
                value={Math.round(sortIntensity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setSortIntensity(v / 100)}
                suffix="%"
              />
            </div>
          )}

          {/* 形变控件 */}
          {(mode === "morph" || mode === "pipeline") && (
            <div className="space-y-3 pml-card p-3">
              <SectionLabel>形变（交叉溶解）</SectionLabel>
              <SliderRow
                label="强度"
                value={Math.round(morphAmount * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setMorphAmount(v / 100)}
                suffix="%"
              />
              <Row>
                <label className="text-xs text-[var(--pml-prose-muted)]">缓动</label>
                <Select value={morphEase} onValueChange={(v) => setMorphEase(v as any)}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">线性</SelectItem>
                    <SelectItem value="easeinout">缓入缓出</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </div>
          )}

          {/* 故障控件 */}
          {(mode === "glitch" || mode === "pipeline") && (
            <div className="space-y-3 pml-card p-3">
              <SectionLabel>故障（块位移）</SectionLabel>
              <SliderRow
                label="强度"
                value={Math.round(glitchAmount * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setGlitchAmount(v / 100)}
                suffix="%"
              />
              <SliderRow
                label="块数量"
                value={glitchBlocks}
                min={1}
                max={60}
                step={1}
                onChange={setGlitchBlocks}
              />
              <Row>
                <label className="text-xs text-[var(--pml-prose-muted)]">种子</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    value={glitchSeed}
                    onChange={(e) => setGlitchSeed(Number(e.target.value) || 0)}
                    className="h-8 w-20 text-xs bg-transparent border rounded px-2"
                    style={{ borderColor: "var(--pml-border)" }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shuffleSeed}>
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Row>
            </div>
          )}

          {mode === "pipeline" && (
            <div className="pml-card p-3 flex items-center justify-between">
              <div>
                <SectionLabel>流水线顺序</SectionLabel>
                <p className="text-[11px] text-[var(--pml-prose-muted)] mt-0.5">
                  打开则在形变前先执行像素排序
                </p>
              </div>
              <Switch checked={pipelineSortFirst} onCheckedChange={setPipelineSortFirst} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageBox({
  label,
  name,
  url,
  onPick,
}: {
  label: string;
  name: string;
  url: string;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="pml-card p-2 text-left hover:shadow-md transition-shadow group"
      style={{ borderColor: "var(--pml-border)" }}
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--pml-prose-muted)]">
        {label}
      </div>
      <div
        className="mt-1 aspect-square w-full rounded bg-[var(--pml-muted)] flex items-center justify-center overflow-hidden"
      >
        <img src={url} alt={name} className="w-full h-full object-contain" />
      </div>
      <div className="mt-1 text-[10px] font-mono text-[var(--pml-prose)] truncate flex items-center gap-1">
        <Upload className="h-2.5 w-2.5 inline-block opacity-50 group-hover:opacity-100" />
        {name}
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pml-accent)]">
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">{children}</div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--pml-prose-muted)]">{label}</label>
        <span className="text-xs font-mono text-[var(--pml-prose)]">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(arr) => onChange(arr[0])}
        className="pml-slider"
      />
    </div>
  );
}

function resizeBuffer(buf: RGBABuffer, w: number, h: number): RGBABuffer {
  if (typeof document === "undefined") return buf;
  const canvas = document.createElement("canvas");
  canvas.width = buf.width;
  canvas.height = buf.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const imgData = new ImageData(buf.data, buf.width, buf.height);
  ctx.putImageData(imgData, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  octx.imageSmoothingEnabled = true;
  octx.drawImage(canvas, 0, 0, w, h);
  return { data: octx.getImageData(0, 0, w, h).data, width: w, height: h };
}
