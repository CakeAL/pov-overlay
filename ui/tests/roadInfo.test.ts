// @vitest-environment jsdom
import { readFile } from "node:fs/promises";
import { afterEach, expect, test, vi } from "vitest";
import { createApp, ref, nextTick } from "vue";
import { roadIdentity } from "../domain/roadIdentity";
import { hasLocationFields, type LocationAddress } from "../domain/location";
import { widgetSvg } from "../domain/widgetSvg";
import { roadBadgeFor } from "../infrastructure/roadBadges";
import { renderWidgetSvg } from "../infrastructure/renderWidget";
import { ROAD_INFO_SOURCE } from "../domain/roadInfoOverlay";
import {
  parseDocument,
  validateWidgets,
} from "../infrastructure/documents/schema";
import { useWidgetLayout } from "../composables/useWidgetLayout";
import { useSvgElements } from "../composables/useSvgElements";
import { useMessages } from "../composables/useMessages";
import { useRoadBadge } from "../composables/useRoadBadge";
import type { Widget } from "../domain/types";
vi.mock("../infrastructure/maps/geocoding", () => ({
  addressForFrame: vi.fn(async (sample) =>
    sample ? address("沈海高速") : null,
  ),
}));
vi.mock("../infrastructure/media", async (original) => ({
  ...(await original<typeof import("../infrastructure/media")>()),
  native: false,
}));
const address = (road: string, province = "安徽省"): LocationAddress => ({
  road,
  province,
  city: "",
  district: "",
  street: "",
});
const widget = (): Widget => ({
  id: "road",
  kind: "svg",
  label: "道路名称与编号",
  x: 0,
  y: 0,
  scale: 1,
  opacity: 0,
  color: "#ffffff",
  visible: true,
  locked: false,
  widthRatio: 0.42,
  svg: {
    source: ROAD_INFO_SOURCE,
    aspectRatio: 7.2,
    roadInfo: { badgePosition: "before", showEnglish: true },
  },
});
const dom = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
function fonts() {
  vi.stubGlobal("fetch", async (url: string) => {
    const data = await readFile(`src-tauri/resources${url}`);
    return {
      ok: true,
      arrayBuffer: async () =>
        data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    };
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("uses explicit codes or exact verified names and never guesses IDs, unknown names, intersecting roads or auxiliary roads", () => {
  expect(roadIdentity(address("沈海高速"))).toMatchObject({
    name: "沈海高速",
    code: "G15",
    type: "nationalExpressway",
  });
  expect(roadIdentity(address("宁信高速"))?.code).toBe("G3611");
  expect(roadIdentity(address("杭州湾环线高速"))?.code).toBe("G92");
  expect(roadIdentity(address("G15 沈海高速公路"))).toMatchObject({
    name: "沈海高速",
    code: "G15",
  });
  for (const name of [
    "未知高速",
    "沈海高速辅路",
    "沈海高速匝道",
    "沈海高速出口",
    "G15 / G104",
    "G15000",
    "ROADG15",
  ])
    expect(
      roadIdentity({ ...address(name), id: "G15" } as LocationAddress),
    ).toBeNull();
  expect(roadIdentity(address("G15 沈海高速连接线"))).toBeNull();
  expect(roadIdentity(address("沈海高速连接线"))).toBeNull();
});

test("distinguishes national, provincial and local road classes, preserves zeroes, and permits manual overrides without inventing a position", () => {
  for (const [name, code, type] of [
    ["G104京福线", "G104", "national"],
    ["201省道", "S201", "provincial"],
    ["S326新丹高速", "S326", "provincialExpressway"],
    ["S12高速", "S12", "provincialExpressway"],
    ["G0421许广高速", "G0421", "nationalExpressway"],
    ["X123", "X123", "county"],
    ["Y321", "Y321", "township"],
  ])
    expect(roadIdentity(address(name!, "广东省"))).toMatchObject({
      code,
      type,
      province: "粤",
    });
  expect(
    roadIdentity(address("未知高速"), { numberOverride: "G15" }),
  ).toMatchObject({ code: "G15" });
  expect(
    roadIdentity(address("未知高速"), {
      numberOverride: "S326",
      typeOverride: "provincialExpressway",
    }),
  ).toMatchObject({ type: "provincialExpressway" });
  expect(
    roadIdentity(address("未知路"), {
      numberOverride: "G15",
      typeOverride: "provincial",
    }),
  ).toBeNull();
  expect(roadIdentity(address(""), { numberOverride: "G15" })).toBeNull();
  expect(roadIdentity(null, { numberOverride: "G15" })).toBeNull();
});

test("composes a path-only number shield and Chinese/English name, supports either side, hides unavailable and stale shields, and escapes external names", async () => {
  fonts();
  const w = widget(),
    a = address("沈海高速");
  const badge = await roadBadgeFor(roadIdentity(a)!);
  expect(dom(badge!.source).querySelector("text,image")).toBeNull();
  expect(dom(badge!.source).querySelector("path")).not.toBeNull();
  let svg = widgetSvg(w, null, 0, 16 / 9, { address: a, roadBadge: badge });
  let doc = dom(svg);
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.querySelectorAll("svg")).toHaveLength(2);
  expect(doc.querySelector("svg svg")!.getAttribute("x")).toBe("0");
  expect(doc.querySelector("text")!.textContent).toBe("沈海高速");
  expect(doc.documentElement.textContent).toContain("Shenyang-Haikou Expy.");
  w.svg!.roadInfo = { badgePosition: "after", showEnglish: false };
  doc = dom(widgetSvg(w, null, 0, 16 / 9, { address: a, roadBadge: badge }));
  expect(
    Number(doc.querySelector("svg svg")!.getAttribute("x")),
  ).toBeGreaterThan(0);
  expect(doc.querySelector("text")!.getAttribute("x")).toBe("0");
  expect(doc.documentElement.textContent).not.toContain("Expy.");
  for (const road of ["未知路", "宁信高速", "<script>外部</script>&路"]) {
    doc = dom(
      widgetSvg(w, null, 0, 16 / 9, {
        address: address(road),
        roadBadge: badge,
      }),
    );
    expect(doc.querySelectorAll("svg")).toHaveLength(1);
    expect(doc.querySelector("script,parsererror,image")).toBeNull();
    expect(doc.querySelector("text")!.getAttribute("x")).toBe("0");
  }
});

test("library insertion, undo/redo and preset restore preserve the composite configuration and validate untrusted settings", () => {
  const layout = useWidgetLayout(ref(16 / 9), ref<HTMLElement>());
  layout.widgets.value = [];
  let elements!: ReturnType<typeof useSvgElements>;
  const app = createApp({
    setup() {
      elements = useSvgElements(layout, useMessages());
      return () => null;
    },
  });
  app.mount(document.createElement("div"));
  try {
    elements.addTelemetryItem("roadInfo");
    const w = layout.selected.value!;
    expect(hasLocationFields(w)).toBe(true);
    expect(w.svg?.roadInfo).toMatchObject({ badgePosition: "before" });
    layout.undo();
    expect(layout.widgets.value).toHaveLength(0);
    layout.redo();
    expect(layout.widgets.value[0]!.svg?.roadInfo).toBeDefined();
    w.svg!.roadInfo = {
      badgePosition: "after",
      numberOverride: "S12",
      typeOverride: "provincialExpressway",
      showEnglish: false,
    };
    w.svg!.source =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const preset = {
      type: "pov-overlay/preset",
      version: 1,
      name: "道路",
      widgets: [w],
      smoothingPoints: 7,
      refreshSeconds: 0.2,
      aspectRatio: 16 / 9,
    };
    const restored = parseDocument(JSON.stringify(preset), "preset")
      .widgets[0]!;
    expect(restored.svg?.roadInfo).toEqual(w.svg!.roadInfo);
    expect(restored.svg?.source).toContain("{$Road}");
    expect(dom(restored.svg!.source).querySelector("script")).toBeNull();
    for (const bad of [
      { showEnglish: "true" },
      { badgePosition: "invalid" },
      { numberOverride: "G15", typeOverride: "county" },
      { numberOverride: "G15000" },
      { typeOverride: "bogus" },
    ])
      expect(() =>
        validateWidgets([{ ...w, svg: { ...w.svg, roadInfo: bad } }]),
      ).toThrow();
  } finally {
    app.unmount();
  }
});

test("export awaits the same cached vector shield and emits name-only when the address is absent", async () => {
  fonts();
  const w = widget();
  const result = await renderWidgetSvg(w, {} as never, 0, 16 / 9);
  const badge = await roadBadgeFor(roadIdentity(address("沈海高速"))!);
  expect(result).toBe(
    widgetSvg(w, null, 0, 16 / 9, {
      address: address("沈海高速"),
      roadBadge: badge,
    }),
  );
  const empty = dom(await renderWidgetSvg(w, null, 0, 16 / 9));
  expect(empty.querySelectorAll("svg")).toHaveLength(1);
  expect(empty.querySelector("text")!.textContent).toBe("—");
});

test("preview discards an earlier shield immediately when the road changes and ignores pending work after unmount", async () => {
  fonts();
  const w = ref(widget()),
    a = ref<LocationAddress | null>(address("沈海高速"));
  let badge!: ReturnType<typeof useRoadBadge>;
  const app = createApp({
    setup() {
      badge = useRoadBadge(w, a, () => {});
      return () => null;
    },
  });
  app.mount(document.createElement("div"));
  try {
    await roadBadgeFor(roadIdentity(a.value)!);
    await nextTick();
    await Promise.resolve();
    expect(badge.value?.code).toBe("G15");
    a.value = address("未知路");
    await nextTick();
    expect(badge.value).toBeNull();
    a.value = null;
    await nextTick();
    expect(badge.value).toBeNull();
  } finally {
    app.unmount();
  }
});
