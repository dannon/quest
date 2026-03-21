type MessageHandler = (msg: ServerMessage) => void;

interface OutputMessage {
  type: 'output';
  sessionId: string;
  data: string;
}

interface ExitMessage {
  type: 'exit';
  sessionId: string;
  code: number;
  signal: number;
}

interface ErrorMessage {
  type: 'error';
  sessionId: string;
  message: string;
}

type ServerMessage = OutputMessage | ExitMessage | ErrorMessage;

export class WsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private _connected = false;
  private _authenticated = false;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  get connected(): boolean {
    return this._connected && this._authenticated;
  }

  connect(): void {
    if (this.ws) return;

    this._authenticated = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this._connected = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      // Send auth token as first message
      this.ws!.send(JSON.stringify({ type: 'auth', token: this.token }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);

        // Handle auth response
        if (!this._authenticated && msg.type === 'error') {
          if (msg.message === 'auth ok') {
            this._authenticated = true;
          } else if (msg.message === 'auth failed') {
            console.error('[ws] auth failed -- bad token');
            this.ws?.close();
            return;
          }
        }

        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this._authenticated = false;
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN && this._authenticated) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  spawn(sessionId: string, cols: number, rows: number): void {
    this.send({ type: 'spawn', sessionId, cols, rows });
  }

  input(sessionId: string, data: string): void {
    this.send({ type: 'input', sessionId, data });
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.send({ type: 'resize', sessionId, cols, rows });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._connected = false;
    this._authenticated = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}
