import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface MaterialOptions {
  color?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
}

export class CADViewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshStandardMaterial;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(100, 100, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10000;

    this.material = new THREE.MeshStandardMaterial({
      color: 0xe8b024,
      metalness: 0.3,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    this.setupLights();
    this.setupGrid();
    this.setupAxis();

    window.addEventListener("resize", () => this.onResize(container));

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(100, 200, 100);
    directional.castShadow = true;
    this.scene.add(directional);

    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-100, -100, -100);
    this.scene.add(fill);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(500, 50, 0x333333, 0x222222);
    this.scene.add(gridHelper);
  }

  private setupAxis(): void {
    const axisSize = 50;
    const origin = new THREE.Vector3(0, 0, 0);

    const xGeom = new THREE.BufferGeometry().setFromPoints([
      origin,
      new THREE.Vector3(axisSize, 0, 0),
    ]);
    const yGeom = new THREE.BufferGeometry().setFromPoints([
      origin,
      new THREE.Vector3(0, axisSize, 0),
    ]);
    const zGeom = new THREE.BufferGeometry().setFromPoints([
      origin,
      new THREE.Vector3(0, 0, axisSize),
    ]);

    this.scene.add(new THREE.Line(xGeom, new THREE.LineBasicMaterial({ color: 0xff4444 })));
    this.scene.add(new THREE.Line(yGeom, new THREE.LineBasicMaterial({ color: 0x44ff44 })));
    this.scene.add(new THREE.Line(zGeom, new THREE.LineBasicMaterial({ color: 0x4444ff })));
  }

  loadGeometry(geometry: THREE.BufferGeometry): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const size = new THREE.Vector3();
    box.getSize(size);

    geometry.translate(-center.x, -center.y, -center.z);

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    this.camera.position.set(distance, distance, distance);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    const fov = this.camera.fov * (Math.PI / 180);
    const maxDistance = (maxDim * 1.5) / (2 * Math.tan(fov / 2));
    this.controls.maxDistance = Math.max(maxDistance * 3, 500);
    this.controls.minDistance = maxDim * 0.01;
  }

  setMaterial(options: MaterialOptions): void {
    if (options.color !== undefined) this.material.color.setHex(options.color);
    if (options.metalness !== undefined) this.material.metalness = options.metalness;
    if (options.roughness !== undefined) this.material.roughness = options.roughness;
    if (options.opacity !== undefined) {
      this.material.transparent = true;
      this.material.opacity = options.opacity;
    }
    this.material.needsUpdate = true;
  }

  resetCamera(): void {
    if (this.mesh?.geometry.boundingBox) {
      const box = this.mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2.5;
      this.camera.position.set(distance, distance, distance);
    } else {
      this.camera.position.set(100, 100, 100);
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  dispose(): void {
    this.renderer.dispose();
    this.controls.dispose();
  }
}