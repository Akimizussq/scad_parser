# OpenSCAD Web Viewer — 项目设计文档

## 1. 项目概述

**项目名称**: `scad-viewer`

**核心功能**: 一个纯前端网页平台，用户上传 `.scad` 文件（OpenSCAD 源码），通过 openscad-wasm 在浏览器内编译为 STL，然后使用 Three.js 渲染三维模型并提供交互式查看。

**目标用户**: OpenSCAD 用户、3D 打印爱好者、CAD 设计分享者

**技术栈**:
- 构建工具: Vite + TypeScript
- 核心解析: openscad-wasm (官方 WebAssembly 编译版)
- 3D 渲染: Three.js + @types/three
- UI: 原生 HTML/CSS/JS（轻量、无框架依赖）

---

## 2. 功能列表

### 核心功能

| 功能 | 描述 | 优先级 |
|---|---|---|
| `.scad` 文件上传 | 支持拖拽上传或点击选择本地文件 | 必须 |
| OpenSCAD 编译 | 浏览器内通过 openscad-wasm 编译 scad → STL | 必须 |
| 3D 模型渲染 | Three.js 显示编译后的 STL 模型 | 必须 |
| 交互式查看 | 鼠标旋转/缩放/平移、视角切换 | 必须 |
| 参数提取与控件 | 自动识别 scad 中的参数变量，生成滑块/输入框 | 应该 |
| 编译状态反馈 | 显示加载动画和编译进度 | 应该 |
| STL 导出 | 一键下载编译结果为 .stl 文件 | 可以 |

### 进阶功能

| 功能 | 描述 | 优先级 |
|---|---|---|
| 代码编辑区 | 显示/编辑 scad 源码 | 可以 |
| 预设示例 | 内置几个示例模型供快速体验 | 可以 |
| 响应式布局 | 适配桌面和移动端 | 可以 |

---

## 3. 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                        UI Layer                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 文件上传 │  │  参数控制面板  │  │   Three.js 3D 视图  │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                     Core Engine                          │
│  ┌────────────────┐      ┌─────────────────────────┐  │
│  │  openscad-wasm  │ ──── │  STL → Three.js Mesh    │  │
│  │  (编译 .scad)    │      │  (几何体转换 + 材质)      │  │
│  └────────────────┘      └─────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                        Output                           │
│              ┌─────────────────────────┐               │
│              │   Three.js 渲染 + 交互    │               │
│              └─────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 关键模块

#### 3.1 OpenSCAD 编译模块 (`src/engine/wasm.ts`)

```typescript
// 职责：加载 WASM、写入 scad 源码、执行编译、返回 STL 二进制数据
async function compileSCAD(source: string): Promise<Uint8Array>
```

#### 3.2 STL 解析模块 (`src/engine/parser.ts`)

```typescript
// 职责：将二进制 STL 转换为 Three.js BufferGeometry
function parseSTL(buffer: Uint8Array): BufferGeometry
```

#### 3.3 参数提取模块 (`src/engine/params.ts`)

```typescript
// 职责：从 scad 源码中提取变量定义，生成参数控件配置
interface ParamConfig {
  name: string
  type: 'number' | 'string' | 'boolean'
  default: any
  min?: number
  max?: number
}
function extractParams(source: string): ParamConfig[]
```

#### 3.4 渲染控制器 (`src/viewer/renderer.ts`)

```typescript
// 职责：初始化 Three.js 场景、灯光、相机、控制器
// 职责：接收几何数据、绑定材质、渲染场景
class CADViewer {
  loadGeometry(geometry: BufferGeometry): void
  setMaterial(options: MaterialOptions): void
  resetCamera(): void
}
```

---

## 4. UI 设计

### 页面布局

```
┌────────────────────────────────────────────────────────┐
│  Header: 项目标题 + 文件上传按钮                        │
├─────────────────┬──────────────────────────────────────┤
│                 │                                       │
│  参数控制面板    │         Three.js 3D 视图             │
│  (左侧 sidebar) │         (右侧主区域)                  │
│                 │                                       │
│  - 参数滑块     │                                       │
│  - 参数输入框   │                                       │
│                 │                                       │
├─────────────────┴──────────────────────────────────────┤
│  Status Bar: 编译状态 / 进度 / 导出按钮                  │
└────────────────────────────────────────────────────────┘
```

### 颜色主题

- 背景: `#1a1a2e` (深蓝灰)
- 面板: `#16213e` (深蓝)
- 主色调: `#0f3460` (靛蓝)
- 强调色: `#e94560` (珊瑚红)
- 文字: `#eaeaea`
- 3D 视图背景: `#0a0a0f`

### 交互反馈

- 文件拖拽时边框高亮
- 编译中显示旋转加载动画 + 百分比
- 参数变化时自动重新编译（防抖 500ms）
- 编译完成后相机自动 fit 模型

---

## 5. 已知限制与应对

| 限制 | 应对方式 |
|---|---|
| WASM 文件约 20MB | CDN 托管 + 懒加载（首次渲染时才加载）|
| 复杂模型编译 5-20s | 显示进度动画；使用 `--enable=manifold` 加速 |
| 移动端性能差 | 提示"建议使用桌面浏览器"；降级渲染 |
| 需要 HTTP 服务器 | 开发用 `npx vite`，部署用静态托管 |

---

## 6. 项目结构

```
scad-viewer/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts              # 入口
│   ├── style.css            # 全局样式
│   ├── engine/
│   │   ├── wasm.ts          # openscad-wasm 集成
│   │   ├── parser.ts         # STL 解析
│   │   └── params.ts         # 参数提取
│   ├── viewer/
│   │   ├── renderer.ts       # Three.js 渲染器
│   │   └── controls.ts       # 视角控制
│   └── ui/
│       ├── fileUpload.ts     # 文件上传组件
│       ├── paramPanel.ts     # 参数控制面板
│       └── statusBar.ts      # 状态栏
├── public/
│   └── openscad.wasm         # WASM 文件（懒加载）
└── examples/                  # 示例 .scad 文件
    ├── simple-cube.scad
    ├── parametric-box.scad
    └── boolean-ops.scad
```

---

## 7. 开发计划

### Phase 1: 基础框架
- [x] 创建项目结构
- [ ] 配置 Vite + TypeScript
- [ ] 实现 openscad-wasm 加载和编译流程
- [ ] 实现 Three.js 基础渲染

### Phase 2: 功能完善
- [ ] 文件上传 UI（拖拽 + 点击）
- [ ] 参数提取和控件生成
- [ ] 编译状态动画
- [ ] STL 导出功能

### Phase 3: 体验优化
- [ ] 示例模型预设
- [ ] 响应式布局
- [ ] 移动端提示
- [ ] 性能优化（缓存、防抖）

---

## 8. 参考资料

- [openscad-wasm](https://github.com/openscad/openscad-wasm)
- [Three.js STLLoader](https://threejs.org/examples/#webgl_loader_stl)
- [Scadder](https://github.com/solderlocks/scadder) — 类似的完整实现参考