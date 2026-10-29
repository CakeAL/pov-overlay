import type { LocationAddress } from "./location";
export const ROAD_TYPES = [
  "nationalExpressway",
  "provincialExpressway",
  "national",
  "provincial",
  "county",
  "township",
] as const;
export type RoadType = (typeof ROAD_TYPES)[number];
export interface RoadInfoOptions {
  badgePosition?: "before" | "after";
  showEnglish?: boolean;
  numberOverride?: string;
  typeOverride?: RoadType;
}
export interface RoadIdentity {
  name: string;
  code: string;
  type: RoadType;
  province: string;
  english?: string;
}
export interface RoadBadge {
  source: string;
  code: string;
  type: RoadType;
  province: string;
  width: number;
  height: number;
}
// Public route-name correspondences; exact matches only, not a complete road database.
// Sources: README, “道路名称与编号”. Never apply to ramps, frontage roads or partial names.
const nationalNames: Record<string, string> = {
  沈海高速: "G15",
  宁信高速: "G3611",
  京沪高速: "G2",
  京台高速: "G3",
  长深高速: "G25",
  连霍高速: "G30",
  宁洛高速: "G36",
  沪陕高速: "G40",
  沪蓉高速: "G42",
  沪渝高速: "G50",
  常台高速: "G1522",
  杭州湾环线高速: "G92",
  许广高速: "G0421",
  京港澳高速: "G4",
  济广高速: "G35",
  广澳高速: "G0425",
  乐广高速: "G0423",
  盐洛高速: "G1516",
  盐靖高速: "G1515",
  宁芜高速: "G4211",
  沪武高速: "G4221",
  淮徐高速: "G2513",
  扬溧高速: "G4011",
};
const englishNames: Record<string, string> = {
  沈海高速: "Shenyang-Haikou Expy.",
  宁信高速: "Nanjing-Xinyang Expy.",
};
const provinces: Record<string, string> = {
  北京: "京",
  天津: "津",
  河北: "冀",
  山西: "晋",
  内蒙古: "蒙",
  辽宁: "辽",
  吉林: "吉",
  黑龙江: "黑",
  上海: "沪",
  江苏: "苏",
  浙江: "浙",
  安徽: "皖",
  福建: "闽",
  江西: "赣",
  山东: "鲁",
  河南: "豫",
  湖北: "鄂",
  湖南: "湘",
  广东: "粤",
  广西: "桂",
  海南: "琼",
  重庆: "渝",
  四川: "川",
  贵州: "贵",
  云南: "云",
  西藏: "藏",
  陕西: "陕",
  甘肃: "甘",
  青海: "青",
  宁夏: "宁",
  新疆: "新",
};
export function provinceShortName(value: string) {
  return (
    Object.entries(provinces).find(([name]) => value.startsWith(name))?.[1] ??
    ""
  );
}
export function roadCodeType(code: string, name = ""): RoadType | null {
  if (/^G(?:\d{1,2}|\d{4})$/.test(code)) return "nationalExpressway";
  if (/^G\d{3}$/.test(code)) return "national";
  if (/^S\d{3}$/.test(code))
    return /高速/.test(name) ? "provincialExpressway" : "provincial";
  if (/^S(?:\d{1,2}|\d{4})$/.test(code)) return "provincialExpressway";
  if (/^X\d{3}$/.test(code)) return "county";
  if (/^Y\d{3}$/.test(code)) return "township";
  return null;
}
export function validRoadType(code: string, type: RoadType) {
  const prefix = (
    {
      nationalExpressway: "G",
      provincialExpressway: "S",
      national: "G",
      provincial: "S",
      county: "X",
      township: "Y",
    } as const
  )[type];
  return (
    code.startsWith(prefix) &&
    (type === "nationalExpressway"
      ? /^G(?:\d{1,2}|\d{4})$/.test(code)
      : type === "provincialExpressway"
        ? /^S\d{1,4}$/.test(code)
        : /^[GSXY]\d{3}$/.test(code))
  );
}
export function roadIdentity(
  address: LocationAddress | null | undefined,
  options: RoadInfoOptions = {},
): RoadIdentity | null {
  const raw = address?.road.trim();
  if (!raw) return null;
  const normalized = raw.replace(/高速公路/g, "高速");
  const explicit = [
    ...normalized.matchAll(/(?<![a-z0-9])([GSXY])\s*(\d{1,4})(?![a-z0-9])/gi),
  ].map((m) => `${m[1]!.toUpperCase()}${m[2]}`);
  for (const m of normalized.matchAll(/(?<!\d)(\d{3})(国道|省道|县道|乡道)/g))
    explicit.push(
      (
        { 国道: "G", 省道: "S", 县道: "X", 乡道: "Y" } as Record<string, string>
      )[m[2]!]! + m[1],
    );
  const override = options.numberOverride?.trim().toUpperCase();
  if (
    !override &&
    (/辅路|匝道|连接线|服务区|收费站|出入口|入口|出口/.test(raw) ||
      new Set(explicit).size > 1)
  )
    return null;
  const code = override || explicit[0] || nationalNames[normalized];
  if (!code) return null;
  const type = options.typeOverride ?? roadCodeType(code, normalized);
  if (!type || !validRoadType(code, type)) return null;
  let name =
    normalized
      .replace(/(?<![a-z0-9])[GSXY]\s*\d{1,4}(?![a-z0-9])/gi, "")
      .replace(/^[\s()（）·/—-]+|[\s()（）·/—-]+$/g, "") || raw;
  if (/^(国道|省道|县道|乡道|高速)$/.test(name)) name = raw;
  return {
    name,
    code,
    type,
    province: provinceShortName(address?.province ?? ""),
    english: englishNames[name],
  };
}
export function roadBadgeKey(
  value: Pick<RoadIdentity, "type" | "code" | "province">,
) {
  return `${value.type}:${value.code}:${value.province}`;
}
