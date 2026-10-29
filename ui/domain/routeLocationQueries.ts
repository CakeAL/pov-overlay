import { locationKey, locationQuery } from "./location";
import { sampleAt } from "./telemetry";
import { MAX_GAP_MS, type Track } from "./types";
/** The same fixed buckets and incoming positions used by playback; never bridge gaps. */
export function* routeLocationQueries(track: Track, intervalSeconds: number) {
  const intervalMs = Math.max(1, Math.min(300, intervalSeconds || 5)) * 1000;
  const seen = new Set<string>();
  for (let start = 0; start < track.samples.length; ) {
    let end = start;
    while (
      end + 1 < track.samples.length &&
      track.samples[end + 1]!.segment === track.samples[end]!.segment &&
      track.samples[end + 1]!.timestampMs - track.samples[end]!.timestampMs <=
        MAX_GAP_MS
    )
      end++;
    for (
      let time = track.samples[start]!.timestampMs;
      time <= track.samples[end]!.timestampMs;
      time += intervalMs
    ) {
      const query = locationQuery(
        sampleAt(track, time),
        { track, timestampMs: time },
        intervalSeconds,
      );
      if (query && !seen.has(locationKey(query))) {
        seen.add(locationKey(query));
        yield query;
      }
    }
    start = end + 1;
  }
}
