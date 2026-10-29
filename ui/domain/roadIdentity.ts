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
  roads?: RoadMapping[];
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
export interface RoadMapping {
  name: string;
  province: string;
  city: string;
  code: string;
  type?: RoadType;
}
export const normalizeRoadName = (name: string) =>
  name.trim().replace(/高速公路/g, "高速");
export const roadMappingKey = (
  row: Pick<RoadMapping, "name" | "province" | "city">,
) =>
  JSON.stringify([
    normalizeRoadName(row.name),
    row.province.trim(),
    row.city.trim(),
  ]);
export function mappingFor(address: LocationAddress, rows: RoadMapping[]) {
  const matches = rows.filter(
    (row) =>
      normalizeRoadName(row.name) === normalizeRoadName(address.road) &&
      (!row.province || row.province === address.province) &&
      (!row.city || row.city === address.city),
  );
  matches.sort(
    (a, b) =>
      Number(!!b.province) +
      Number(!!b.city) -
      Number(!!a.province) -
      Number(!!a.city),
  );
  if (
    matches.length > 1 &&
    Number(!!matches[0]!.province) + Number(!!matches[0]!.city) ===
      Number(!!matches[1]!.province) + Number(!!matches[1]!.city)
  )
    return undefined;
  return matches[0];
}
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
  const normalized = normalizeRoadName(raw);
  const mapping = mappingFor(address!, options.roads ?? []);
  const explicit = [
    ...normalized.matchAll(/(?<![a-z0-9])([GSXY])\s*(\d{1,4})(?![a-z0-9])/gi),
  ].map((m) => `${m[1]!.toUpperCase()}${m[2]}`);
  for (const m of normalized.matchAll(/(?<!\d)(\d{3})(国道|省道|县道|乡道)/g))
    explicit.push(
      (
        { 国道: "G", 省道: "S", 县道: "X", 乡道: "Y" } as Record<string, string>
      )[m[2]!]! + m[1],
    );
  const override = mapping?.code.trim().toUpperCase();
  if (mapping && !override) return null;
  if (
    !override &&
    (/辅路|匝道|连接线|服务区|收费站|出入口|入口|出口/.test(raw) ||
      new Set(explicit).size > 1)
  )
    return null;
  const code = override || explicit[0];
  if (!code) return null;
  const type = mapping?.type ?? roadCodeType(code, normalized);
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
