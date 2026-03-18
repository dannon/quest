import {
  createSystem,
  Vector3,
  Quaternion,
} from '@iwsdk/core';
import { TerminalPanel } from '../components/terminal-panel.js';
import { PanelAnchor, AnchorMode } from '../components/panel-anchor.js';

export class PanelManagementSystem extends createSystem({
  panels: { required: [TerminalPanel, PanelAnchor] },
}) {
  private headPos!: Vector3;
  private headDir!: Vector3;
  private targetPos!: Vector3;
  private tempQuat!: Quaternion;

  init() {
    this.headPos = new Vector3();
    this.headDir = new Vector3(0, 0, -1);
    this.targetPos = new Vector3();
    this.tempQuat = new Quaternion();
  }

  update() {
    for (const entity of this.queries.panels.entities) {
      const mode = PanelAnchor.data.mode[entity.index];
      if (mode !== AnchorMode.HeadTracked) continue;

      const obj = entity.object3D;
      if (!obj) continue;

      // Position panel 1.5m in front of the head, at head height
      this.player.head.getWorldPosition(this.headPos);
      this.player.head.getWorldQuaternion(this.tempQuat);
      this.headDir.set(0, 0, -1).applyQuaternion(this.tempQuat);

      this.targetPos.copy(this.headPos).addScaledVector(this.headDir, 1.5);

      // Smooth follow — lerp toward target
      obj.position.lerp(this.targetPos, 0.05);

      // Face the user
      obj.lookAt(this.headPos);
    }
  }
}
