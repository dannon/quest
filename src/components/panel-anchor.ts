import { createComponent, Types } from '@iwsdk/core';

export const AnchorMode = {
  WorldAnchored: 'WorldAnchored',
  HeadTracked: 'HeadTracked',
} as const;

export const PanelAnchor = createComponent('PanelAnchor', {
  mode: { type: Types.Enum, default: AnchorMode.WorldAnchored, enum: AnchorMode },
});
