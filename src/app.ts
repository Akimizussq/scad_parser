import { parseSTL } from "./engine/parser";
import { extractParams, applyParams, ParamConfig } from "./engine/params";
import { CADViewer } from "./viewer/renderer";
import * as THREE from "three";

let viewer: CADViewer | null = null;
let currentSource = "";
let params: ParamConfig[] = [];
let compileTimeout: ReturnType<typeof setTimeout> | null = null;

export function init(container: HTMLElement): void {
  viewer = new CADViewer(container);
}

export async function loadSCAD(source: string): Promise<void> {
  if (compileTimeout) clearTimeout(compileTimeout);

  currentSource = source;
  params = extractParams(source);
  renderParams(params);

  const { initWASM, compileSCAD, isWASMReady, isCompiling } = await import("./engine/wasm");

  const showLoading = (progress: number, message: string) => {
    const overlay = document.getElementById("loadingOverlay");
    const text = document.getElementById("loadingText");
    const fill = document.getElementById("progressFill");
    if (overlay) overlay.classList.remove("hidden");
    if (text) text.textContent = message;
    if (fill) fill.style.width = `${progress}%`;
  };

  const hideLoading = () => {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("hidden");
  };

  const setStatus = (msg: string) => {
    const el = document.getElementById("statusText");
    if (el) el.textContent = msg;
  };

  try {
    if (!isWASMReady()) {
      showLoading(5, "正在加载 OpenSCAD...");
      await initWASM(undefined, showLoading);
    }

    showLoading(20, "正在编译模型...");
    setStatus("正在编译...");

    if (isCompiling()) {
      showLoading(20, "等待上一个编译完成...");
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isCompiling()) resolve();
          else setTimeout(check, 200);
        };
        check();
      });
    }

    const result = await compileSCAD(source, showLoading);

    if (result.success && result.stlBuffer) {
      showLoading(80, "正在解析模型...");
      setStatus("正在解析几何数据...");

      const geometry = parseSTL(result.stlBuffer);

      showLoading(95, "正在渲染...");
      if (viewer) {
        viewer.loadGeometry(geometry);
      }

      setStatus(`模型已加载 (顶点: ${geometry.attributes.position.count})`);
      hideLoading();
    } else {
      setStatus(`编译失败: ${result.error}`);
      hideLoading();
    }
  } catch (err: any) {
    setStatus(`错误: ${err?.message || "未知错误"}`);
    hideLoading();
  }
}

export function updateParam(name: string, value: number): void {
  const param = params.find((p) => p.name === name);
  if (!param) return;
  param.default = value;

  debouncedRecompile();
}

function debouncedRecompile(): void {
  if (compileTimeout) clearTimeout(compileTimeout);
  compileTimeout = setTimeout(async () => {
    const modifiedSource = applyParams(currentSource, params);
    const { initWASM, compileSCAD, isWASMReady } = await import("./engine/wasm");

    const showLoading = (progress: number, message: string) => {
      const overlay = document.getElementById("loadingOverlay");
      const text = document.getElementById("loadingText");
      const fill = document.getElementById("progressFill");
      if (overlay) overlay.classList.remove("hidden");
      if (text) text.textContent = message;
      if (fill) fill.style.width = `${progress}%`;
    };

    const hideLoading = () => {
      const overlay = document.getElementById("loadingOverlay");
      if (overlay) overlay.classList.add("hidden");
    };

    const setStatus = (msg: string) => {
      const el = document.getElementById("statusText");
      if (el) el.textContent = msg;
    };

    try {
      if (!isWASMReady()) {
        await initWASM(undefined, showLoading);
      }

      showLoading(20, "正在编译模型...");
      setStatus("正在编译...");

      const result = await compileSCAD(modifiedSource, showLoading);

      if (result.success && result.stlBuffer) {
        showLoading(80, "正在解析模型...");
        setStatus("正在解析几何数据...");

        const geometry = parseSTL(result.stlBuffer);

        showLoading(95, "正在渲染...");
        if (viewer) {
          viewer.loadGeometry(geometry);
        }

        setStatus(`模型已加载 (顶点: ${geometry.attributes.position.count})`);
        hideLoading();
      } else {
        const errMsg = result.openScadErrors?.[0] || result.error;
        setStatus(`编译失败: ${errMsg}`);
        hideLoading();
      }
    } catch (err: any) {
      setStatus(`错误: ${err?.message || "未知错误"}`);
      hideLoading();
    }
  }, 500);
}

function renderParams(configs: ParamConfig[]): void {
  const container = document.getElementById("paramList");
  if (!container) return;

  if (configs.length === 0) {
    container.innerHTML =
      '<p class="placeholder-text">此文件无参数变量</p>';
    return;
  }

  container.innerHTML = configs
    .map(
      (config) => `
    <div class="param-group">
      <label for="param-${config.name}">${config.name}</label>
      <input
        type="range"
        id="param-${config.name}"
        min="${config.min ?? 0}"
        max="${config.max ?? 100}"
        step="${config.step ?? 1}"
        value="${config.default}"
      />
      <div class="param-value">
        <input type="number" value="${config.default}" size="6" />
      </div>
    </div>
  `
    )
    .join("");

  container.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const name = target.id.replace("param-", "");
      const value = parseFloat(target.value);
      updateParam(name, value);

      const numInput = target
        .closest(".param-group")
        ?.querySelector('input[type="number"]') as HTMLInputElement;
      if (numInput) numInput.value = value.toString();
    });
  });

  container.querySelectorAll('input[type="number"]').forEach((numInput) => {
    numInput.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const slider = target
        .closest(".param-group")
        ?.querySelector('input[type="range"]') as HTMLInputElement;
      if (slider) {
        slider.value = target.value;
        const name = slider.id.replace("param-", "");
        updateParam(name, parseFloat(target.value));
      }
    });
  });
}

export function resetCamera(): void {
  viewer?.resetCamera();
}

export function exportSTL(): void {
  const mesh = viewer?.getMesh();
  if (!mesh) {
    alert("请先加载模型");
    return;
  }

  const geometry = mesh.geometry as THREE.BufferGeometry;
  const stlData = createBinarySTL(geometry);
  const blob = new Blob([new Uint8Array(stlData)], { type: "application/octet-stream" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "model.stl";
  link.click();
  URL.revokeObjectURL(url);
}

function createBinarySTL(geometry: THREE.BufferGeometry): Uint8Array {
  const positions = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");

  const triangleCount = positions.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0);
  view.setUint8(1, 0);
  for (let i = 2; i < 80; i++) view.setUint8(i, 0);
  view.setUint32(80, triangleCount, true);

  let offset = 84;

  for (let i = 0; i < triangleCount; i++) {
    const base = i * 3;

    let nx = 0,
      ny = 0,
      nz = 1;
    if (normal) {
      nx = normal.getX(base);
      ny = normal.getY(base);
      nz = normal.getZ(base);
    }

    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);

    for (let j = 0; j < 3; j++) {
      const vi = base + j;
      view.setFloat32(offset + 12 + j * 12, positions.getX(vi), true);
      view.setFloat32(offset + 16 + j * 12, positions.getY(vi), true);
      view.setFloat32(offset + 20 + j * 12, positions.getZ(vi), true);
    }

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  return new Uint8Array(buffer);
}