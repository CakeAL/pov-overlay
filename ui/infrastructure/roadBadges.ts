import { newSignDesign } from "../domain/signs/model";
import { renderSign } from "../domain/signs/render";
import {
  roadBadgeKey,
  type RoadIdentity,
  type RoadBadge,
} from "../domain/roadIdentity";
import { outlineSign } from "./signFonts";
const cache = new Map<string, Promise<RoadBadge | null>>();
export function roadBadgeFor(
  identity: RoadIdentity,
): Promise<RoadBadge | null> {
  if (identity.type === "provincialExpressway" && !identity.province)
    return Promise.resolve(null);
  const key = roadBadgeKey(identity),
    existing = cache.get(key);
  if (existing) return existing;
  const request = (async () => {
    const design = newSignDesign(identity.type);
    design.code = identity.code.slice(1);
    design.province = identity.province;
    const svg = renderSign(design);
    const source = await outlineSign(svg.source);
    return {
      source,
      code: identity.code,
      type: identity.type,
      province: identity.province,
      width: svg.viewWidth,
      height: svg.viewHeight,
    };
  })().catch((reason) => {
    cache.delete(key);
    throw reason;
  });
  cache.set(key, request);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  return request;
}
