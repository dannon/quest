import { createComponent, Types } from '@iwsdk/core';

export const ConnectDialog = createComponent('ConnectDialog', {
  visible: { type: Types.Boolean, default: true },
});
