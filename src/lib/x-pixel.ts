export const X_PIXEL_ID = 'rh4bd';
export const X_EVENT_PREFIX = `tw-${X_PIXEL_ID}-`;

export const xEventId = (step: 'match_start' | 'match_end', uniqueId: string) =>
  `${X_EVENT_PREFIX}${step}-${uniqueId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
