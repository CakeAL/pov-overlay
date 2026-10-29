import { roadIdentity } from "../domain/roadIdentity";
import { roadBadgeFor } from "./roadBadges";
import { hasLocationFields } from "../domain/location";
import { addressForFrame } from "./maps/geocoding";
import type { Widget, Sample } from '../domain/types';
import type { OverlayContext } from '../domain/overlayContext';
import { widgetSvg } from '../domain/widgetSvg';
import { mapScene, mapSvg } from '../domain/mapOverlay';
import { styleWidgetSvg } from '../domain/widgetTypography';
import { amapImage, amapImageCached, amapImageKey } from './maps/amap';
import { mapTile, mapTileCached } from './maps/tiles';
export function prepareMapRender(widget: Widget, sample: Sample | null, context: OverlayContext) {
  const scene = mapScene(widget, sample, context);
  const empty = widget.scale <= 0 || widget.map?.opacity === 0;
  const resourceKey = empty ? 'empty' : scene.raster ? `amap/${amapImageKey(scene.raster)}` : scene.tiles.map(tile => `${tile.provider ?? "osm"}/${tile.z}/${tile.x}/${tile.y}`).join('|');
  return {
    resourceKey,
    renderKey: JSON.stringify([widget.map, widget.typography, widget.color, scene, empty]),
    ready: empty || (scene.raster ? amapImageCached(scene.raster) : scene.tiles.every(mapTileCached)),
    render: async (signal?: AbortSignal) => {
      if (empty) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"/>';
      const images = scene.raster ? [await amapImage(scene.raster, signal)] : await Promise.all(scene.tiles.map(tile => mapTile(tile, signal)));
      return styleWidgetSvg(mapSvg(widget, scene, images), widget.typography);
    },
  };
}
export async function renderWidgetSvg(widget: Widget, sample: Sample | null, elapsed: number, ratio: number, context: OverlayContext = {}, signal?: AbortSignal): Promise<string> {
  if (hasLocationFields(widget)) {
    const address = await addressForFrame(sample, context, signal);
    const identity = widget.svg?.roadInfo && widget.svg.roadInfo.mode !== "name" ? roadIdentity(address, widget.svg.roadInfo) : null;
    const roadBadge = identity ? await roadBadgeFor(identity) : null;
    if (signal?.aborted) throw new DOMException('导出已取消。', 'AbortError');
    return widgetSvg(widget, sample, elapsed, ratio, { ...context, address, roadBadge });
  }
  if (widget.kind !== 'minimap') return widgetSvg(widget, sample, elapsed, ratio, context);
  return prepareMapRender(widget, sample, context).render(signal);
}
