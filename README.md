# SCAD Viewer

一个纯前端 OpenSCAD 网页查看器，基于 openscad-wasm 和 Three.js 构建。

## 功能

- 上传 `.scad` 文件或拖拽文件
- 浏览器内编译 OpenSCAD 模型
- Three.js 交互式 3D 渲染（旋转/缩放/平移）
- 自动提取参数并生成控件
- 导出 STL 文件

## 快速开始

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 示例文件

在 `examples/` 目录下有 3 个示例文件：
- `simple-cube.scad` — 基础立方体
- `parametric-box.scad` — 参数化盒子
- `boolean-ops.scad` — 布尔运算示例

## 技术栈

- **openscad-wasm** — 在浏览器中运行完整的 OpenSCAD 引擎
- **Three.js** — 3D 渲染
- **Vite** — 构建工具
- **TypeScript** — 开发语言

## 项目结构

```
src/
  engine/
    wasm.ts      # openscad-wasm 集成
    parser.ts    # STL 解析
    params.ts    # 参数提取
  viewer/
    renderer.ts  # Three.js 渲染器
  app.ts        # 应用逻辑
  main.ts       # 入口
  style.css     # 样式
```

## 已知限制

- 首次加载 WASM 文件约 13MB（使用 CDN 缓存后秒开）
- 复杂模型编译需要 5-20 秒
- 移动端性能较差，建议使用桌面浏览器

## 部署

构建产物在 `dist/` 目录，可部署到任何静态托管服务（GitHub Pages、Vercel、Netlify 等）。

```bash
npm run build
```

## 参考

- [openscad-wasm](https://github.com/openscad/openscad-wasm)
- [Scadder](https://github.com/solderlocks/scadder)
- [Three.js](https://threejs.org/)