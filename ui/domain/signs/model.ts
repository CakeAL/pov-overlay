export const SIGN_CATEGORIES = [
  { key: "names", label: "道路名称标识" },
  { key: "junctions", label: "交叉路口" },
  { key: "distances", label: "地点距离标识" },
  { key: "interchanges", label: "立交枢纽指引" },
  { key: "exits", label: "出入口指引" },
  { key: "free", label: "自由模式" },
] as const;
export type SignCategory = (typeof SIGN_CATEGORIES)[number]["key"];
export const SIGN_TEMPLATES = [
  { value: "nationalExpressway", label: "国家高速", category: "names" },
  { value: "provincialExpressway", label: "省级高速", category: "names" },
  { value: "national", label: "国道编号", category: "names" },
  { value: "provincial", label: "省道编号", category: "names" },
  { value: "county", label: "县道编号", category: "names" },
  { value: "township", label: "乡道编号", category: "names" },
  { value: "roadName", label: "城市路名", category: "names" },
  { value: "urbanExpressway", label: "无编号快速路名", category: "names" },
  { value: "direction", label: "堆叠式指路", category: "junctions" },
  { value: "tJunction", label: "丁字路口（竖式）", category: "junctions" },
  { value: "wideTJunction", label: "丁字路口（横式）", category: "junctions" },
  { value: "dividedJunction", label: "分隔式交叉路口", category: "junctions" },
  { value: "laneGuidance", label: "车道式指路", category: "junctions" },
  { value: "crossroads", label: "十字路口图形式", category: "junctions" },
  { value: "roundabout", label: "环岛图形式", category: "junctions" },
  { value: "distance", label: "地点距离", category: "distances" },
  { value: "interchange", label: "分向指路", category: "interchanges" },
  { value: "fork", label: "道路分岔预告", category: "interchanges" },
  { value: "exit", label: "出口预告", category: "exits" },
  { value: "entrance", label: "入口预告", category: "exits" },
  { value: "free", label: "自由文字与方向", category: "free" },
] as const;
export type SignTemplate = (typeof SIGN_TEMPLATES)[number]["value"];
export const DIRECTIONS = [
  { value: "straight", label: "直行" },
  { value: "left", label: "左转" },
  { value: "right", label: "右转" },
  { value: "upperLeft", label: "左前方" },
  { value: "upperRight", label: "右前方" },
] as const;
export type SignDirection = (typeof DIRECTIONS)[number]["value"];
export interface SignDestination {
  name: string;
  english: string;
  distance: string;
  direction: SignDirection;
  content?: "text" | "route" | "roadName";
  routeCode?: string;
  routeType?:
    | "nationalExpressway"
    | "provincialExpressway"
    | "national"
    | "provincial"
    | "county"
    | "township";
  onArrow?: boolean;
  endpointRouteCode?: string;
}
export interface SignDesign {
  template: SignTemplate;
  code: string;
  province: string;
  roadName: string;
  english: string;
  exitNumber: string;
  exitDistance: string;
  green: boolean;
  outputWidth: number;
  destinations: SignDestination[];
  freeWidth: number;
  freeHeight: number;
  cardinal?: string;
  cardinalSide?: "left" | "right";
  centerRoad?: string;
}
export const emptyDestination = (): SignDestination => ({
  name: "",
  english: "",
  distance: "",
  direction: "straight",
});
export const newSignDesign = (
  template: SignTemplate = "nationalExpressway",
): SignDesign => ({
  template,
  code: "",
  province: "",
  roadName: "",
  english: "",
  exitNumber: "",
  exitDistance: "",
  green: false,
  outputWidth: 1200,
  destinations: [
    {
      ...emptyDestination(),
      direction: ["interchange", "fork"].includes(template)
        ? "left"
        : "straight",
    },
  ],
  freeWidth: 1000,
  freeHeight: 600,
});
export const isExpressway = (template: SignTemplate) =>
  template === "nationalExpressway" || template === "provincialExpressway";
export const isRouteNumber = (template: SignTemplate) =>
  isExpressway(template) ||
  ["national", "provincial", "county", "township"].includes(template);
export const signCategory = (template: SignTemplate): SignCategory =>
  SIGN_TEMPLATES.find((t) => t.value === template)!.category;
export const signCode = (d: SignDesign) =>
  (
    ({
      nationalExpressway: "G",
      provincialExpressway: "S",
      national: "G",
      provincial: "S",
      county: "X",
      township: "Y",
    }) as Record<string, string>
  )[d.template] + d.code;
export const signLabel = (d: SignDesign) =>
  d.roadName ||
  (isRouteNumber(d.template) && d.code ? signCode(d) : "") ||
  d.destinations.find((row) => row.name)?.name ||
  SIGN_TEMPLATES.find((t) => t.value === d.template)!.label;
export function validateSign(d: SignDesign, complete = true) {
  if (!SIGN_TEMPLATES.some((t) => t.value === d.template))
    throw new Error("标牌类型无效。");
  if (
    !Number.isInteger(d.outputWidth) ||
    d.outputWidth < 128 ||
    d.outputWidth > 7680
  )
    throw new Error("输出宽度须为 128–7680 像素。");
  const check = (text: string, max: number) => {
    if (
      typeof text !== "string" ||
      [...text].length > max ||
      /[\u0000-\u001f]/.test(text)
    )
      throw new Error(`文字最多 ${max} 字，不能包含换行或控制字符。`);
  };
  check(d.code, 4);
  check(d.province, 1);
  check(d.roadName, 20);
  check(d.english, 80);
  check(d.cardinal ?? "", 1);
  check(d.centerRoad ?? "", 10);
  if (d.cardinalSide && !["left", "right"].includes(d.cardinalSide))
    throw new Error("方位角标位置无效。");
  if (d.cardinal && !["东", "南", "西", "北"].includes(d.cardinal))
    throw new Error("方位角标无效。");
  check(d.exitNumber, 8);
  check(d.exitDistance, 12);
  if (
    isRouteNumber(d.template) &&
    (complete || d.code) &&
    !(isExpressway(d.template) ? /^\d{1,4}$/ : /^\d{3}$/).test(d.code)
  )
    throw new Error(
      isExpressway(d.template)
        ? "编号填写 1–4 位数字，前缀自动生成。"
        : "编号填写 3 位数字，前缀自动生成。",
    );
  if (complete && d.template === "provincialExpressway" && !d.province.trim())
    throw new Error("请填写省份简称。");
  if (
    d.destinations.length < 1 ||
    d.destinations.length >
      (d.template === "free" ? 6 : d.template === "roundabout" ? 5 : 3)
  )
    throw new Error("目的地最多三行，环岛最多五个方向，自由模式最多六行。");
  for (const row of d.destinations) {
    check(row.name, 20);
    if (row.endpointRouteCode && !/^[GS]\d{3}$/.test(row.endpointRouteCode))
      throw new Error("端点编号须为 G/S 加三位数字。");
    if (row.routeCode && !/^[GSXY]\d{1,4}$/.test(row.routeCode))
      throw new Error("道路编号须包含 G/S/X/Y 和数字。");
    if (row.content && !["text", "route", "roadName"].includes(row.content))
      throw new Error("信息类型无效。");
    if (
      row.routeType &&
      ![
        "nationalExpressway",
        "provincialExpressway",
        "national",
        "provincial",
        "county",
        "township",
      ].includes(row.routeType)
    )
      throw new Error("道路编号类型无效。");
    if (
      row.routeCode &&
      row.routeType &&
      row.routeCode[0] !==
        (
          {
            nationalExpressway: "G",
            provincialExpressway: "S",
            national: "G",
            provincial: "S",
            county: "X",
            township: "Y",
          } as const
        )[row.routeType]
    )
      throw new Error("道路编号前缀与类型不一致。");
    check(row.english, 80);
    check(row.distance, 8);
    if (!DIRECTIONS.some((x) => x.value === row.direction))
      throw new Error("方向无效。");
    if (row.distance && !/^\d{1,4}(\.\d{1,2})?$/.test(row.distance))
      throw new Error("距离填写公里数，最多两位小数。");
  }
  if (
    d.template === "free" &&
    ![d.freeWidth, d.freeHeight].every(
      (n) => Number.isFinite(n) && n >= 200 && n <= 4000,
    )
  )
    throw new Error("自由画板尺寸须为 200–4000。");
  if (
    [
      "crossroads",
      "roundabout",
      "tJunction",
      "wideTJunction",
      "dividedJunction",
    ].includes(d.template)
  ) {
    const directions = d.destinations
      .filter((r) => r.name || r.routeCode)
      .map((r) =>
        d.template === "roundabout"
          ? r.direction
          : r.direction === "left" || r.direction === "upperLeft"
            ? "left"
            : r.direction === "straight"
              ? "straight"
              : "right",
      );
    if (new Set(directions).size !== directions.length)
      throw new Error("图形式每个方向只能设置一组目的地。");
  }
  if (["interchange", "fork"].includes(d.template) && d.destinations.length > 2)
    throw new Error("此分向版式最多两个方向。");
  if (
    d.template === "free" &&
    d.freeHeight <
      (d.destinations.some((row) => row.english) ? 110 : 80) *
        d.destinations.length +
        40
  )
    throw new Error("画板高度不足，请增加高度或减少文字行数。");
  if (
    ["interchange", "fork"].includes(d.template) &&
    new Set(
      d.destinations
        .filter((r) => r.name || r.routeCode)
        .map((r) =>
          r.direction === "left" || r.direction === "upperLeft"
            ? "left"
            : "right",
        ),
    ).size !== d.destinations.filter((r) => r.name || r.routeCode).length
  )
    throw new Error("分向标志的两个目的地应分属左右方向。");
  if (
    ["tJunction", "wideTJunction"].includes(d.template) &&
    (d.destinations.length > 2 ||
      d.destinations.some(
        (row) => !["straight", "right"].includes(row.direction),
      ))
  )
    throw new Error("丁字路口支持直行、右转两个方向。");
  if (!complete) return;
  if (
    ["roadName", "urbanExpressway"].includes(d.template) &&
    !d.roadName.trim()
  )
    throw new Error("请填写道路名称。");
  if (
    !isRouteNumber(d.template) &&
    !["roadName", "urbanExpressway"].includes(d.template) &&
    d.destinations.some((row) =>
      row.content === "route" ? !row.routeCode : !row.name.trim(),
    )
  )
    throw new Error("请填写每行目的地。");
  if (d.template === "distance" && d.destinations.some((row) => !row.distance))
    throw new Error("请填写每行距离。");
}
