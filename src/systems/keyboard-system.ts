import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  UIKitDocument,
  UIKit,
} from '@iwsdk/core';
import { VirtualKeyboard } from '../components/virtual-keyboard.js';
import { bridges } from './terminal-render-system.js';

// Map key IDs to characters/sequences
const KEY_MAP: Record<string, string> = {
  // Letters
  'key-a': 'a', 'key-b': 'b', 'key-c': 'c', 'key-d': 'd', 'key-e': 'e',
  'key-f': 'f', 'key-g': 'g', 'key-h': 'h', 'key-i': 'i', 'key-j': 'j',
  'key-k': 'k', 'key-l': 'l', 'key-m': 'm', 'key-n': 'n', 'key-o': 'o',
  'key-p': 'p', 'key-q': 'q', 'key-r': 'r', 'key-s': 's', 'key-t': 't',
  'key-u': 'u', 'key-v': 'v', 'key-w': 'w', 'key-x': 'x', 'key-y': 'y',
  'key-z': 'z',
  // Numbers
  'key-0': '0', 'key-1': '1', 'key-2': '2', 'key-3': '3', 'key-4': '4',
  'key-5': '5', 'key-6': '6', 'key-7': '7', 'key-8': '8', 'key-9': '9',
  // Symbols
  'key-backtick': '`', 'key-minus': '-', 'key-equals': '=',
  'key-lbracket': '[', 'key-rbracket': ']', 'key-backslash': '\\',
  'key-semicolon': ';', 'key-quote': "'", 'key-comma': ',',
  'key-period': '.', 'key-slash': '/',
  // Space
  'key-space': ' ',
};

const SHIFT_MAP: Record<string, string> = {
  'key-backtick': '~', 'key-1': '!', 'key-2': '@', 'key-3': '#',
  'key-4': '$', 'key-5': '%', 'key-6': '^', 'key-7': '&', 'key-8': '*',
  'key-9': '(', 'key-0': ')', 'key-minus': '_', 'key-equals': '+',
  'key-lbracket': '{', 'key-rbracket': '}', 'key-backslash': '|',
  'key-semicolon': ':', 'key-quote': '"', 'key-comma': '<',
  'key-period': '>', 'key-slash': '?',
};

// Special keys → ANSI escape sequences
const SPECIAL_KEYS: Record<string, string> = {
  'key-enter': '\r',
  'key-backspace': '\x7f',
  'key-tab': '\t',
  'key-esc': '\x1b',
  'key-up': '\x1b[A',
  'key-down': '\x1b[B',
  'key-right': '\x1b[C',
  'key-left': '\x1b[D',
  'key-ctrl-c': '\x03',
};

export class KeyboardSystem extends createSystem({
  keyboard: {
    required: [VirtualKeyboard, PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/keyboard.json')],
  },
}) {
  init() {
    this.queries.keyboard.subscribe('qualify', (entity) => {
      const document = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!document) return;

      const allKeyIds = [
        ...Object.keys(KEY_MAP),
        ...Object.keys(SPECIAL_KEYS),
        'key-shift', 'key-shift2', 'key-ctrl',
      ];

      for (const keyId of allKeyIds) {
        const btn = document.getElementById(keyId) as UIKit.Text;
        if (!btn) continue;

        btn.addEventListener('click', () => {
          this.handleKeyPress(entity.index, keyId);
        });
      }
    });
  }

  private handleKeyPress(entityIndex: number, keyId: string): void {
    const targetIdx = VirtualKeyboard.data.targetTerminalIndex[entityIndex];
    if (targetIdx < 0) return;

    const bridge = bridges.get(targetIdx);
    if (!bridge) return;

    // Modifier toggles
    if (keyId === 'key-shift' || keyId === 'key-shift2') {
      const current = VirtualKeyboard.data.shiftActive[entityIndex];
      (VirtualKeyboard.data.shiftActive as unknown as number[])[entityIndex] = current ? 0 : 1;
      return;
    }
    if (keyId === 'key-ctrl') {
      const current = VirtualKeyboard.data.ctrlActive[entityIndex];
      (VirtualKeyboard.data.ctrlActive as unknown as number[])[entityIndex] = current ? 0 : 1;
      return;
    }

    const isShift = !!VirtualKeyboard.data.shiftActive[entityIndex];
    const isCtrl = !!VirtualKeyboard.data.ctrlActive[entityIndex];

    // Special keys
    if (SPECIAL_KEYS[keyId]) {
      bridge.terminal.paste(SPECIAL_KEYS[keyId]);
      return;
    }

    // Regular keys
    let char = KEY_MAP[keyId];
    if (!char) return;

    if (isShift) {
      if (SHIFT_MAP[keyId]) {
        char = SHIFT_MAP[keyId];
      } else {
        char = char.toUpperCase();
      }
      // Auto-release shift after one key
      (VirtualKeyboard.data.shiftActive as unknown as number[])[entityIndex] = 0;
    }

    if (isCtrl) {
      // Ctrl+letter → ASCII control code
      const code = char.toLowerCase().charCodeAt(0) - 96;
      if (code >= 1 && code <= 26) {
        bridge.terminal.paste(String.fromCharCode(code));
      }
      (VirtualKeyboard.data.ctrlActive as unknown as number[])[entityIndex] = 0;
      return;
    }

    bridge.terminal.paste(char);
  }
}
