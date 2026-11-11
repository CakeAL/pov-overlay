import { describe, expect, it } from "vitest";
import { containRect, svgAspect } from "../domain/widgetGeometry";
import { ROAD_BADGE_SOURCE } from "../domain/roadInfoOverlay";
import type { RoadBadge } from "../domain/roadIdentity";
import type { Widget } from "../domain/types";
import { widgetSvg } from "../domain/widgetSvg";

const badgeWidget = (): Widget => ({
  id: "road-badge",
  kind: "svg",
  label: "道路编号",
  x: 0,
  y: 0,
  scale: 1,
  opacity: 0,
  color: "#ffffff",
  visible: true,
  locked: false,
  widthRatio: 0.12,
  svg: { source: ROAD_BADGE_SOURCE, aspectRatio: 2, roadInfo: { mode: "badge" } },
});
const badge: RoadBadge = {
  source:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 240"><rect width="250" height="240" fill="#319543"/></svg>',
  code: "G15",
  type: "nationalExpressway",
  province: "",
  width: 250,
  height: 240,
};
const address = {
  province: "",
  city: "",
  district: "",
  street: "",
  road: "G15沈海高速",
};

describe("exported widget image fitting", () => {
  it("keeps the road badge viewBox instead of filling the 2:1 widget box", () => {
    const source = widgetSvg(badgeWidget(), null, 0, 16 / 9, {
      address,
      roadBadge: badge,
    });
    expect(svgAspect(source)).toBeCloseTo(250 / 240);
  });
  it("contains a nearly square badge inside a 2:1 widget box without stretching", () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 240" width="100%" height="100%" preserveAspectRatio="xMinYMid"><rect width="250" height="240"/></svg>';
    const aspect = svgAspect(source);
    expect(aspect).toBeCloseTo(250 / 240);
    const fit = containRect(aspect!, 200, 100);
    expect(fit.height).toBe(100);
    expect(fit.width).toBeCloseTo((100 * 250) / 240);
    expect(fit.x).toBeCloseTo((200 - (100 * 250) / 240) / 2);
    expect(fit.y).toBe(0);
  });
  it("reads viewBox or pixel dimensions and leaves matching boxes unchanged", () => {
    expect(svgAspect('<svg viewBox="-5 -5 120 60"/>')).toBe(2);
    expect(svgAspect('<svg width="120px" height="60px"/>')).toBe(2);
    expect(svgAspect("<svg/>")).toBeNull();
    expect(containRect(2, 200, 100)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(containRect(1, 200, 100)).toEqual({
      x: 50,
      y: 0,
      width: 100,
      height: 100,
    });
    expect(containRect(Number.NaN, 200, 100)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });
});
