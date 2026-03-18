import { createComponent, Types } from '@iwsdk/core';

export const VoiceInput = createComponent('VoiceInput', {
  enabled: { type: Types.Boolean, default: true },
  listening: { type: Types.Boolean, default: false },
  transcript: { type: Types.String, default: '' },
});
