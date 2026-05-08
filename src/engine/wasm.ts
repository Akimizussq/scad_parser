import { createOpenSCAD, OpenSCADInstance } from "openscad-wasm";

export interface CompileResult {
  success: boolean;
  stlBuffer?: Uint8Array;
  error?: string;
  openScadErrors?: string[];
}

let instance: OpenSCADInstance | null = null;
let isLoading = false;
let isReady = false;
let loadCallbacks: Array<(ready: boolean) => void> = [];

export async function initWASM(
  _wasmUrl?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  if (instance && isReady) return true;
  if (isLoading) {
    return new Promise((resolve) => {
      loadCallbacks.push((ready) => resolve(ready));
    });
  }

  isLoading = true;

  try {
    onProgress?.(5, "正在加载 OpenSCAD 引擎...");

    const printBuffer: string[] = [];
    const printErrBuffer: string[] = [];

    instance = await createOpenSCAD({
      noInitialRun: true,
      print: (text: string) => printBuffer.push(text),
      printErr: (text: string) => printErrBuffer.push(text),
    });

    onProgress?.(80, "WASM 模块就绪");
    isReady = true;
    isLoading = false;

    loadCallbacks.forEach((cb) => cb(true));
    loadCallbacks = [];

    onProgress?.(100, "完成");
    return true;
  } catch (err) {
    isLoading = false;
    loadCallbacks.forEach((cb) => cb(false));
    loadCallbacks = [];
    console.error("Failed to load OpenSCAD WASM:", err);
    throw err;
  }
}

export async function compileSCAD(
  source: string,
  onProgress?: (progress: number, message: string) => void
): Promise<CompileResult> {
  if (!instance || !isReady) {
    return { success: false, error: "OpenSCAD 未初始化" };
  }

  try {
    onProgress?.(10, "正在编译 OpenSCAD 模型...");

    const openscad = (instance as any).getInstance();

    const openScadErrors: string[] = [];
    openscad.print = (text: string) => console.log("[OpenSCAD]:", text);
    openscad.printErr = (text: string) => {
      if (text.toLowerCase().includes("error")) {
        openScadErrors.push(text);
        console.error("[OpenSCAD Error]:", text);
      } else {
        console.log("[OpenSCAD]:", text);
      }
    };

    openscad.FS.writeFile("/input.scad", source);
    try {
      openscad.callMain(["/input.scad", "-o", "/output.stl"]);
    } catch (e) {
      openscad.FS.unlink("/input.scad");
      return { success: false, error: openScadErrors[0] || String(e) };
    }

    onProgress?.(80, "处理编译结果...");

    try {
      const stat = openscad.FS.stat("/output.stl");
      if (stat.size === 0) {
        openscad.FS.unlink("/input.scad");
        openscad.FS.unlink("/output.stl");
        return { success: false, error: openScadErrors[0] || "OpenSCAD 编译失败（输出文件为空）" };
      }
      const rawResult = openscad.FS.readFile("/output.stl");
      const binaryData = rawResult instanceof Uint8Array ? rawResult : new Uint8Array(rawResult);
      openscad.FS.unlink("/input.scad");
      openscad.FS.unlink("/output.stl");
      onProgress?.(100, "编译完成");
      return { success: true, stlBuffer: binaryData, openScadErrors };
    } catch {
      openscad.FS.unlink("/input.scad");
      try { openscad.FS.unlink("/output.stl"); } catch {}
      return { success: false, error: openScadErrors[0] || "OpenSCAD 编译失败" };
    }
  } catch (err: any) {
    console.error("Compile error:", err);
    const msg = err?.message || err?.toString() || "编译过程中发生未知错误";
    return { success: false, error: msg };
  }
}

export function isWASMReady(): boolean {
  return isReady;
}