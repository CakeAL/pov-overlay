import type { Widget, Sample } from '../domain/types';
import type { OverlayContext } from '../domain/overlayContext';
import { widgetSvg } from '../domain/widgetSvg';
import { mapScene, mapSvg } from '../domain/mapOverlay';
import { styleWidgetSvg } from "../domain/widgetTypography";
import { amapImage } from './maps/amap';
import { mapTile } from './maps/tiles';
export async function renderWidgetSvg(widget: Widget, sample: Sample | null, elapsed: number, ratio: number, context: OverlayContext = {}): Promise<string> {
  if (widget.scale <= 0 || widget.kind !== 'minimap') return widgetSvg(widget, sample, elapsed, ratio, context);
  const scene = mapScene(widget, sample, context);
  return styleWidgetSvg(mapSvg(widget, scene, scene.raster ? [await amapImage(scene.raster)] : await Promise.all(scene.tiles.map(mapTile))), widget.typography);
}
