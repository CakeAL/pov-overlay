// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useWidgetLayout } from "../composables/useWidgetLayout";
import { useSvgElements } from "../composables/useSvgElements";
import { useMessages } from "../composables/useMessages";
import { TELEMETRY_STRIP } from "../domain/telemetryStrip";
function setup() {
  const layout = useWidgetLayout(ref(16 / 9), ref<HTMLElement>());
  layout.widgets.value = [];
  return { layout, elements: useSvgElements(layout, useMessages()) };
}
describe("independent telemetry elements", () => {
  it("adds six independently editable items as one undo operation, or adds one item", () => {
    const { layout, elements } = setup();
    elements.addTelemetryStrip();
    expect(layout.widgets.value.map((item) => item.label)).toEqual([
      "航向",
      "经纬度",
      "时间",
      "距离",
      "海拔",
      "速度",
    ]);
    expect(new Set(layout.widgets.value.map((item) => item.id)).size).toBe(6);
    expect(
      layout.widgets.value.every((item) => item.opacity === 0 && !!item.svg),
    ).toBe(true);
    layout.undo();
    expect(layout.widgets.value).toHaveLength(0);
    elements.addTelemetryItem("distance");
    expect(layout.widgets.value).toHaveLength(1);
    expect(layout.selected.value?.svg?.source).toContain("{$Distance}");
  });
  it("splits a legacy strip at its existing position and preserves styles with undo", () => {
    const { layout, elements } = setup();
    elements.addSvg(TELEMETRY_STRIP, "数据条", 0.9);
    const parent = layout.selected.value!;
    Object.assign(parent, {
      x: 0.08,
      y: 0.5,
      scale: 0.8,
      color: "#aabbcc",
      opacity: 20,
      locked: true,
    });
    const parentSize = layout.dimensions(parent);
    expect(elements.canSplitTelemetryStrip.value).toBe(true);
    elements.splitTelemetryStrip();
    expect(layout.widgets.value).toHaveLength(6);
    for (const item of layout.widgets.value) {
      expect(item.color).toBe("#aabbcc");
      expect(item.opacity).toBe(20);
      expect(item.locked).toBe(true);
      expect(item.x).toBeGreaterThanOrEqual(parent.x);
      expect(item.x + layout.dimensions(item).width).toBeLessThanOrEqual(
        parent.x + parentSize.width + 1e-9,
      );
    }
    expect(elements.canSplitTelemetryStrip.value).toBe(false);
    layout.undo();
    expect(layout.widgets.value).toHaveLength(1);
    expect(layout.widgets.value[0]!.x).toBe(0.08);
  });
});
