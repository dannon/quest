import {
  createSystem,
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  DoubleSide,
  Color,
  BoxGeometry,
} from '@iwsdk/core';
import { TerminalPanel } from '../components/terminal-panel.js';
import { TerminalBridge } from '../lib/terminal-bridge.js';

// Maps entity index → TerminalBridge
const bridges = new Map<number, TerminalBridge>();
// Maps entity index → CanvasTexture
const textures = new Map<number, CanvasTexture>();

const TEXTURE_FPS = 15;
const TEXTURE_INTERVAL = 1 / TEXTURE_FPS;

export { bridges };

export class TerminalRenderSystem extends createSystem({
  terminals: { required: [TerminalPanel] },
}) {
  private elapsed = 0;

  init() {
    this.queries.terminals.subscribe('qualify', (entity) => {
      const cols = TerminalPanel.data.cols[entity.index];
      const rows = TerminalPanel.data.rows[entity.index];
      const bridge = new TerminalBridge(cols, rows);
      bridges.set(entity.index, bridge);

      // Terminal plane: 120 cols × 36 rows → ~1.2m × 0.72m
      const plane = new PlaneGeometry(1.2, 0.72);
      const material = new MeshBasicMaterial({
        color: 0xffffff,
        side: DoubleSide,
        transparent: false,
      });

      const mesh = new Mesh(plane, material);
      const obj = entity.object3D!;

      // Frame/bezel around the terminal
      const frameW = 1.24;
      const frameH = 0.76;
      const frameD = 0.02;
      const frameMat = new MeshBasicMaterial({
        color: new Color(0x0a0a1e),
        side: DoubleSide,
      });
      const frame = new Mesh(new BoxGeometry(frameW, frameH, frameD), frameMat);
      frame.position.z = -0.011;
      obj.add(frame);
      obj.add(mesh);

      // The texture will be set on first canvas availability
      const checkCanvas = () => {
        const canvas = bridge.canvas;
        if (canvas) {
          const texture = new CanvasTexture(canvas);
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearFilter;
          texture.magFilter = LinearFilter;
          material.map = texture;
          material.needsUpdate = true;
          textures.set(entity.index, texture);
        } else {
          // xterm.js may need a frame to render its canvas
          requestAnimationFrame(checkCanvas);
        }
      };
      checkCanvas();
    });

    this.queries.terminals.subscribe('disqualify', (entity) => {
      const bridge = bridges.get(entity.index);
      if (bridge) {
        bridge.dispose();
        bridges.delete(entity.index);
      }
      const texture = textures.get(entity.index);
      if (texture) {
        texture.dispose();
        textures.delete(entity.index);
      }
    });
  }

  update(delta: number) {
    this.elapsed += delta;
    if (this.elapsed < TEXTURE_INTERVAL) return;
    this.elapsed = 0;

    for (const entity of this.queries.terminals.entities) {
      const bridge = bridges.get(entity.index);
      const texture = textures.get(entity.index);
      if (bridge && texture && bridge.dirty) {
        texture.needsUpdate = true;
        bridge.clearDirty();
      }
    }
  }
}
