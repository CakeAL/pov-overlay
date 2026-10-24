import { describe, it, expect } from "vitest";
import { snapLayout } from "../domain/layoutSnapping";
const canvas = { width: 1000, height: 600 };
const target = { x: 0.3, y: 0.4, width: 0.2, height: 0.1 };
describe("canvas element snapping", () => {
  it("snaps edges and centers to another element and places guides on that element", () => {
    const result = snapLayout(
      { x: 0.302, y: 0.402, width: 0.1, height: 0.05 },
      [target],
      canvas,
    );
    expect(result.x).toBeCloseTo(0.3);
    expect(result.y).toBeCloseTo(0.4);
    expect(result.guides).toEqual({ x: 0.3, y: 0.4 });
    const center = snapLayout(
      { x: 0.351, y: 0.426, width: 0.1, height: 0.05 },
      [target],
      canvas,
    );
    expect(center.x).toBeCloseTo(0.35);
    expect(center.y).toBeCloseTo(0.425);
    expect(center.guides.x).toBeCloseTo(0.4);
  });
  it("supports an 8px gap and keeps the closest target instead of the last match", () => {
    expect(
      snapLayout(
        { x: 0.509, y: 0.65, width: 0.1, height: 0.05 },
        [target],
        canvas,
      ).x,
    ).toBeCloseTo(0.508);
    const result = snapLayout(
      { x: 0.301, y: 0.65, width: 0.1, height: 0.05 },
      [target, { ...target, x: 0.305 }],
      canvas,
    );
    expect(result.x).toBeCloseTo(0.3);
  });
  it("retains canvas alignment, rejects off-canvas positions, and respects the safe-area switch", () => {
    const centered = snapLayout(
      { x: 0.451, y: 0.476, width: 0.1, height: 0.05 },
      [],
      canvas,
    );
    expect(centered.x).toBeCloseTo(0.45);
    expect(centered.guides.x).toBe(0.5);
    const edge = snapLayout(
      { x: -0.001, y: 0.8, width: 0.4, height: 0.1 },
      [target],
      canvas,
    );
    expect(edge.x).toBe(0);
    expect(edge.guides.x).toBe(0);
    expect(
      snapLayout({ x: 0.041, y: 0.8, width: 0.1, height: 0.05 }, [], canvas).x,
    ).toBe(0.04);
    expect(
      snapLayout(
        { x: 0.041, y: 0.8, width: 0.1, height: 0.05 },
        [],
        canvas,
        false,
      ).x,
    ).toBe(0.041);
  });
});
