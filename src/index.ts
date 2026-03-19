import {
  SessionMode,
  World,
  Interactable,
  DistanceGrabbable,
  MovementMode,
  PanelUI,
} from '@iwsdk/core';

import { TerminalPanel } from './components/terminal-panel.js';
import { PanelAnchor } from './components/panel-anchor.js';
import { VoiceInput } from './components/voice-input.js';
import { VirtualKeyboard } from './components/virtual-keyboard.js';
import { ConnectDialog } from './components/connect-dialog.js';
import { TerminalRenderSystem } from './systems/terminal-render-system.js';
import { TerminalConnectionSystem } from './systems/terminal-connection-system.js';
import { PanelManagementSystem } from './systems/panel-management-system.js';
import { VoiceInputSystem } from './systems/voice-input-system.js';
import { KeyboardSystem } from './systems/keyboard-system.js';
import { ConnectDialogSystem } from './systems/connect-dialog-system.js';
import { ScreenSpace } from '@iwsdk/core';

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

  // Virtual keyboard: below the terminal panel
  const keyboardEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: './ui/keyboard.json',
      maxHeight: 0.5,
      maxWidth: 1.2,
    })
    .addComponent(VirtualKeyboard, {
      targetTerminalIndex: terminalEntity.index,
    })
    .addComponent(Interactable)
    .addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveFromTarget,
    });

  keyboardEntity.object3D!.position.set(0, 1.0, -1.3);

  // Connection dialog: centered, visible before connecting
  const connectEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: './ui/connect.json',
      maxHeight: 0.8,
      maxWidth: 1.2,
    })
    .addComponent(ConnectDialog)
    .addComponent(Interactable)
    .addComponent(ScreenSpace, {
      top: '20px',
      left: '20px',
      height: '60%',
    });

  connectEntity.object3D!.position.set(0, 1.5, -1.2);

  world
    .registerSystem(TerminalRenderSystem)
    .registerSystem(TerminalConnectionSystem)
    .registerSystem(PanelManagementSystem)
    .registerSystem(VoiceInputSystem)
    .registerSystem(KeyboardSystem)
    .registerSystem(ConnectDialogSystem);
});
