import {
  SessionMode,
  World,
  Interactable,
  DistanceGrabbable,
  MovementMode,
} from '@iwsdk/core';

import { TerminalPanel } from './components/terminal-panel.js';
import { PanelAnchor } from './components/panel-anchor.js';
import { VoiceInput } from './components/voice-input.js';
import { TerminalRenderSystem } from './systems/terminal-render-system.js';
import { TerminalConnectionSystem } from './systems/terminal-connection-system.js';
import { PanelManagementSystem } from './systems/panel-management-system.js';
import { VoiceInputSystem } from './systems/voice-input-system.js';

World.create(document.getElementById('scene-container') as HTMLDivElement, {
  xr: {
    sessionMode: SessionMode.ImmersiveAR,
    offer: 'always',
    features: {
      handTracking: true,
      anchors: true,
      hitTest: true,
      planeDetection: true,
      meshDetection: true,
      layers: true,
    },
  },
  features: {
    locomotion: false,
    grabbing: true,
    physics: false,
    sceneUnderstanding: true,
    environmentRaycast: true,
  },
}).then((world) => {
  const { camera } = world;
  camera.position.set(0, 1.5, 0.5);

  // Terminal panel: floating ~1.5m in front of camera, at eye height
  const terminalEntity = world
    .createTransformEntity()
    .addComponent(TerminalPanel, {
      cols: 120,
      rows: 36,
    })
    .addComponent(PanelAnchor)
    .addComponent(VoiceInput)
    .addComponent(Interactable)
    .addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveFromTarget,
    });

  terminalEntity.object3D!.position.set(0, 1.5, -1.5);

  world
    .registerSystem(TerminalRenderSystem)
    .registerSystem(TerminalConnectionSystem)
    .registerSystem(PanelManagementSystem)
    .registerSystem(VoiceInputSystem);
});
