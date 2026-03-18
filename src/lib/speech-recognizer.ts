type ResultCallback = (transcript: string, isFinal: boolean) => void;
type StateCallback = (listening: boolean) => void;

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export class SpeechRecognizerWrapper {
  private recognition: SpeechRecognition | null = null;
  private _listening = false;
  private resultCallbacks = new Set<ResultCallback>();
  private stateCallbacks = new Set<StateCallback>();
  readonly supported: boolean;

  constructor() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SpeechRecognitionCtor;

    if (this.supported) {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          for (const cb of this.resultCallbacks) {
            cb(transcript, result.isFinal);
          }
        }
      };

      this.recognition.onend = () => {
        this._listening = false;
        for (const cb of this.stateCallbacks) cb(false);
      };

      this.recognition.onerror = (event: { error: string }) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[speech] error:', event.error);
        }
      };

      this.recognition.onstart = () => {
        this._listening = true;
        for (const cb of this.stateCallbacks) cb(true);
      };
    }
  }

  get listening(): boolean {
    return this._listening;
  }

  start(): void {
    if (!this.recognition || this._listening) return;
    try {
      this.recognition.start();
    } catch {
      // already started
    }
  }

  stop(): void {
    if (!this.recognition || !this._listening) return;
    this.recognition.stop();
  }

  onResult(callback: ResultCallback): () => void {
    this.resultCallbacks.add(callback);
    return () => this.resultCallbacks.delete(callback);
  }

  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }
}
