import { createComponent, Types } from '@iwsdk/core';

export const TerminalPanel = createComponent('TerminalPanel', {
  sessionId: { type: Types.String, default: '' },
  cols: { type: Types.Int32, default: 120 },
  rows: { type: Types.Int32, default: 36 },
  connected: { type: Types.Boolean, default: false },
});
