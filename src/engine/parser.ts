import * as THREE from "three";

export function parseSTL(buffer: Uint8Array): THREE.BufferGeometry {
  const isBinary = detectBinarySTL(buffer);

  if (isBinary) {
    return parseBinarySTL(buffer);
  } else {
    return parseASCIISTL(buffer);
  }
}

function detectBinarySTL(buffer: Uint8Array): boolean {
  if (buffer.length < 84) return false;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const triangleCount = view.getUint32(80, true);

  const expectedSize = 84 + triangleCount * 50;
  return buffer.length === expectedSize;
}

function parseBinarySTL(buffer: Uint8Array): THREE.BufferGeometry {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const triangleCount = view.getUint32(80, true);

  const vertices: number[] = [];
  const normals: number[] = [];

  let offset = 84;

  for (let i = 0; i < triangleCount; i++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);

    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);

    const v1x = view.getFloat32(offset + 12, true);
    const v1y = view.getFloat32(offset + 16, true);
    const v1z = view.getFloat32(offset + 20, true);

    const v2x = view.getFloat32(offset + 24, true);
    const v2y = view.getFloat32(offset + 28, true);
    const v2z = view.getFloat32(offset + 32, true);

    const v3x = view.getFloat32(offset + 36, true);
    const v3y = view.getFloat32(offset + 40, true);
    const v3z = view.getFloat32(offset + 44, true);

    vertices.push(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);

    offset += 50;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();

  return geometry;
}

function parseASCIISTL(buffer: Uint8Array): THREE.BufferGeometry {
  const decoder = new TextDecoder("utf-8");
  const content = decoder.decode(buffer);

  const vertices: number[] = [];
  const normals: number[] = [];

  const lines = content.split("\n");
  let currentNormal = [0, 0, 1];
  let normalArray: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("facet normal")) {
      const parts = trimmed.split(/\s+/);
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
      normalArray = [];
    } else if (trimmed.startsWith("vertex")) {
      const parts = trimmed.split(/\s+/);
      vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      normalArray.push(currentNormal[0], currentNormal[1], currentNormal[2]);
    } else if (trimmed === "endfacet") {
      normals.push(...normalArray);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();

  return geometry;
}

export function computeCenter(geometry: THREE.BufferGeometry): THREE.Vector3 {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return box.getCenter(new THREE.Vector3());
}

export function computeScaleToFit(
  geometry: THREE.BufferGeometry,
  maxSize: number
): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  return maxSize / maxDim;
}