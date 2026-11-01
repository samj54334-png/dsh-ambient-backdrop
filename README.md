# 氛围背景（dsh-ambient-backdrop）

给 DeepSeek Harness 做**半透明亚克力磨砂**：所有 surface 变透明，主要面板加 `backdrop-filter` 磨砂，嵌套组件一层层叠加。底下可以是渐变，也可以是你自己的图片。

## 功能

- **亚克力磨砂**：`backdrop-filter: blur() saturate()` 打在窗口 frame、左/中/右栏、底部行、输入区和面板上；弹窗、菜单、下拉也有一层。
- **全组件半透明**：`bg-base` / `bg-layer-1` / `bg-layer-2` / `bg-overlay` / `sidebar-fill` 五个 token 全部换成带 alpha 的颜色，嵌套得越深、叠加得越多。
- **可调**：面板透明度 0–70%、磨砂强度 0–40px，实时生效。
- **5 套渐变**：极光、深海、暮色、松林、石墨，深浅主题各有配色。
- **自己的图片**：PNG / JPEG / WebP / GIF / AVIF，上限 30 MB；点选或拖入。图片遮罩可调。
- **跟随主题**：切深色/浅色自动换配色；系统主题变化也跟上。
- **图片不上传**：存浏览器 IndexedDB，只在本机；插件没有网络请求。

## 使用

设置 → **氛围背景**：

| 控件 | 作用 |
| --- | --- |
| 背景样式 | 图片 / 极光 / 深海 / 暮色 / 松林 / 石墨 / 关闭 |
| 背景图片 | 选「图片」后出现：选择、更换、移除，或拖图进去 |
| 图片遮罩 | 有图片时出现：越浓字越清楚，越淡图越明显 |
| 面板透明度 | 越低越透、磨砂后面越明显；越高越接近原生实心 |
| 磨砂强度 | 0 关闭磨砂；20–30 是亚克力常见范围 |

## 原理

1. 背景画在 `body::after`：固定定位、`z-index: -1`、`pointer-events: none`；渐变模式是两层径向光斑 + 线性渐变，图片模式是 `linear-gradient(遮罩色) + url(blob:…)`。
2. `body` / `#root` 强制透明，让背景从根下面露出来。
3. `ctx.theme.overrideTokens()` 覆盖五个背景 token：base / layer-1 / layer-2 / overlay / sidebar-fill。每层都是 rgba，嵌套时自然叠加；overlay 保留更高不透明度，弹窗文字不糊。
4. `discoverGlassSelectors()` 在运行时按语义后缀（`centerCol`、`sidebarCol`、`bottomRow`、`rightbarCol`、`composerSeat`、`panelBody`）找当前构建的 CSS Module 类名，再补上 frame、`[role=dialog]`、`[role=menu]` 等，给它们加 `backdrop-filter`。
5. `MutationObserver` 在面板切换/类名变化后重算一次样式；CSS 文本没变就不重写。
6. 图片以 Blob 存进 IndexedDB（库 `dsh-ambient-backdrop`，表 `assets`，键 `background`），页面里用 `URL.createObjectURL()` 引用，换图/移除时 revoke。
7. 设置页注册在 `settings.section`（id `dsh-ambient-backdrop`，order 46），文案走 `ctx.locale`。

## 已知边界

- 磨砂依赖 `backdrop-filter`，Chrome / Edge 正常；低端 GPU 上 20px 以上可能掉帧，把磨砂强度调低即可。
- 组件背景是否透明取决于它是否使用这些主题 token；写死颜色的特殊控件不会被改。
- 类名发现依赖语义后缀，DSH 改了布局命名时需要更新 `discoverGlassSelectors()` 的列表。

## 文件

```
dsh-ambient-backdrop/
├─ package.json
├─ cordis.patch.yml
├─ index.js          # Host 半边（空）
├─ client.js         # 全部逻辑：背景、磨砂、存储、设置页
├─ locale/en.json
├─ locale/zh.json
├─ icon.svg
└─ README.md
```

## License

MIT
