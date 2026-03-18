import { createComponent, Types } from '@iwsdk/core';

export const VirtualKeyboard = createComponent('VirtualKeyboard', {
  visible: { type: Types.Boolean, default: false },
  shiftActive: { type: Types.Boolean, default: false },
  ctrlActive: { type: Types.Boolean, default: false },
  targetTerminalIndex: { type: Types.Int32, default: -1 },
});
