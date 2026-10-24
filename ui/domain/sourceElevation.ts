import type { TrackSource } from './types';
/** Keep imported samples untouched so a terrain replacement can always be reverted. */
export function sourceElevation(source: TrackSource) {
  if (!source.elevationOverride) return source.track;
  return { ...source.track, samples: source.track.samples.map((sample, i) => ({ ...sample, elevation: source.elevationOverride![i] ?? sample.elevation })) };
}
