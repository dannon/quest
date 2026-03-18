import { Terminal } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export class TerminalBridge {
  readonly terminal: Terminal;
  readonly fitAddon: FitAddon;
  private container: HTMLDivElement;
  private _dirty = true;
  private _canvas: HTMLCanvasElement | null = null;

  constructor(cols = 120, rows = 36) {
    // xterm needs a real DOM element with layout — position off-screen, not display:none
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '960px',
      height: '576px',
      overflow: 'hidden',
    });
    document.body.appendChild(this.container);

    this.terminal = new Terminal({
      cols,
      rows,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#00d4ff',
        selectionBackground: '#44475a',
        black: '#1a1a2e',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#e0e0e0',
        brightBlack: '#44475a',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowTransparency: false,
      cursorBlink: true,
      scrollback: 1000,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.container);

    // Canvas addon gives us an explicit 2D canvas to use as a Three.js texture
    this.terminal.loadAddon(new CanvasAddon());

    this.terminal.onRender(() => {
      this._dirty = true;
    });
  }

  get canvas(): HTMLCanvasElement | null {
    if (!this._canvas) {
      // CanvasAddon renders to a canvas inside .xterm-screen
      this._canvas = this.container.querySelector('.xterm-screen canvas') as HTMLCanvasElement | null;
    }
    return this._canvas;
  }

  get dirty(): boolean {
    return this._dirty;
  }

  clearDirty(): void {
    this._dirty = false;
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  onData(callback: (data: string) => void): void {
    this.terminal.onData(callback);
  }

  resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
  }

  dispose(): void {
    this.terminal.dispose();
    this.container.remove();
  }
}
