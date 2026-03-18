import {
  createSystem,
  InputComponent,
} from '@iwsdk/core';
import { TerminalPanel } from '../components/terminal-panel.js';
import { VoiceInput } from '../components/voice-input.js';
import { SpeechRecognizerWrapper } from '../lib/speech-recognizer.js';
import { bridges } from './terminal-render-system.js';

export class VoiceInputSystem extends createSystem({
  voiceTerminals: { required: [VoiceInput, TerminalPanel] },
}) {
  private recognizer!: SpeechRecognizerWrapper;
  private wasPinching = false;

  init() {
    this.recognizer = new SpeechRecognizerWrapper();

    if (!this.recognizer.supported) {
      console.warn('[voice] Web Speech API not supported');
      return;
    }

    this.recognizer.onResult((transcript, isFinal) => {
      for (const entity of this.queries.voiceTerminals.entities) {
        VoiceInput.data.transcript[entity.index] = transcript;

        if (isFinal) {
          // Send finalized transcript as terminal input + newline
          const bridge = bridges.get(entity.index);
          if (bridge) {
            bridge.terminal.paste(transcript + '\n');
          }
          VoiceInput.data.transcript[entity.index] = '';
        }
      }
    });

    this.recognizer.onStateChange((listening) => {
      for (const entity of this.queries.voiceTerminals.entities) {
        (VoiceInput.data.listening as unknown as number[])[entity.index] = listening ? 1 : 0;
      }
    });
  }

  update() {
    if (!this.recognizer?.supported) return;

    // Push-to-talk: left hand pinch (select) to start/stop
    const leftGamepad = this.input.gamepads.left;
    const isPinching = leftGamepad?.getButtonPressed(InputComponent.Trigger) ?? false;

    if (isPinching && !this.wasPinching) {
      this.recognizer.start();
    } else if (!isPinching && this.wasPinching) {
      this.recognizer.stop();
    }

    this.wasPinching = isPinching;
  }
}
