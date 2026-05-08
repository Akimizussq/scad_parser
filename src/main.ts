import { init, loadSCAD, resetCamera, exportSTL } from "./app";

async function main() {
  const container = document.getElementById("canvasContainer")!;

  init(container);

  const uploadBtn = document.getElementById("uploadBtn")!;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const resetCameraBtn = document.getElementById("resetCameraBtn")!;
  const exportBtn = document.getElementById("exportBtn")!;

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const source = ev.target?.result as string;
      loadSCAD(source).catch(console.error);
    };
    reader.readAsText(file);
  });

  resetCameraBtn.addEventListener("click", resetCamera);
  exportBtn.addEventListener("click", exportSTL);

  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
    document.body.classList.add("drag-over");
  });

  document.body.addEventListener("dragleave", (e) => {
    if (e.target === document.body) {
      document.body.classList.remove("drag-over");
    }
  });

  document.body.addEventListener("drop", async (e) => {
    e.preventDefault();
    document.body.classList.remove("drag-over");

    const file = e.dataTransfer?.files[0];
    if (!file || !file.name.endsWith(".scad")) {
      const status = document.getElementById("statusText");
      if (status) status.textContent = "请拖拽 .scad 文件";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const source = ev.target?.result as string;
      loadSCAD(source).catch(console.error);
    };
    reader.readAsText(file);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        resetCamera();
      }
    }
  });
}

main().catch(console.error);