# 奶蛙桌宠 · 单文件版

`naiwa-pet.html` —— **一个 HTML 文件**内嵌全部素材（174 帧雪碧图 + 2 个音效，base64），双击即可离线运行，无需服务器、无需依赖。

## 使用

直接用浏览器打开 `naiwa-pet.html`（Chrome / Edge / Safari / Firefox 均可），或托管到任意静态服务器。

## 与 React 组件版的关系

单文件版用原生 JavaScript 完整复刻了 [`react/`](../react) 组件版的全部行为，交互参数逐项一致：

- 四形态 12fps 帧动画（idle 58 / smile 9 / laugh 68 / cry 39 帧）
- 单击微笑（750ms）；1.5 秒内连点 5 次大笑（5667ms，音效延迟 300ms）
- 拖拽甩飞：重力 0.4 px/f²、空气阻力 ×0.98、反弹保留 0.70、初速度取最近 100ms 轨迹
- 撞壁挤压变形（上下 40% / 左右 20%，压缩 100ms + 复原 150ms）
- 60fps 固定步长物理 + DPR 自适应渲染
- 音效：WebAudio（smile 音量 0.7 / laugh 音量 0.9）

## 构建

单文件由模板 + 资源注入生成：

```
模板:（主仓库 scripts/naiwa-pet.html.template）
注入:（主仓库 scripts/build_single_html.py）
输出: naiwa-pet.html（约 2.6 MB）
```
