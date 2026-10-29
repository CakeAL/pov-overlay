import {
  newSignDesign,
  emptyDestination,
  type SignDesign,
  type SignDestination,
  type SignTemplate,
} from "./model";
const row = (
  name: string,
  direction: SignDestination["direction"] = "straight",
  distance = "",
  extra: Partial<SignDestination> = {},
): SignDestination => ({
  ...emptyDestination(),
  name,
  direction,
  distance,
  ...extra,
});
const design = (
  template: SignTemplate,
  patch: Partial<SignDesign>,
): SignDesign => ({ ...newSignDesign(template), ...patch });
export const SIGN_EXAMPLES = [
  {
    label: "G3 · 京台高速",
    figure: "图 C.3 a",
    design: design("nationalExpressway", { code: "3", roadName: "京台高速" }),
  },
  {
    label: "G92 · 杭州湾环线高速",
    figure: "图 C.3 c",
    design: design("nationalExpressway", {
      code: "92",
      roadName: "杭州湾环线高速",
    }),
  },
  {
    label: "G1522 · 常台高速",
    figure: "图 C.3 f",
    design: design("nationalExpressway", {
      code: "1522",
      roadName: "常台高速",
    }),
  },
  {
    label: "S0421 · 许广高速",
    figure: "图 C.5",
    design: design("provincialExpressway", {
      code: "0421",
      province: "粤",
      roadName: "许广高速",
    }),
  },
  {
    label: "G101",
    figure: "图 210",
    design: design("national", { code: "101" }),
  },
  {
    label: "S304",
    figure: "图 210",
    design: design("provincial", { code: "304" }),
  },
  {
    label: "X001",
    figure: "图 210",
    design: design("county", { code: "001" }),
  },
  {
    label: "Y001",
    figure: "图 210",
    design: design("township", { code: "001" }),
  },
  {
    label: "北四环",
    figure: "图 259",
    design: design("urbanExpressway", { roadName: "北四环" }),
  },
  {
    label: "昌平 / 顺义 · 竖式",
    figure: "图 205 a",
    design: design("tJunction", {
      destinations: [row("昌平"), row("顺义", "right")],
    }),
  },
  {
    label: "昌平 / 顺义 · 横式",
    figure: "图 205 b",
    design: design("wideTJunction", {
      destinations: [row("昌平"), row("顺义", "right")],
    }),
  },
  {
    label: "南京路 / 东北路",
    figure: "图 205 c",
    design: design("crossroads", {
      cardinal: "北",
      destinations: [
        row("", "straight", "", {
          content: "route",
          routeCode: "G2",
          routeType: "nationalExpressway",
        }),
        row("南京路", "left"),
        row("东北路", "right"),
      ],
    }),
  },
  {
    label: "长江路 / 学院路",
    figure: "图 205 d",
    design: design("dividedJunction", {
      cardinal: "东",
      centerRoad: "学院路",
      destinations: [
        row("长江路"),
        row("南直路", "left"),
        row("阜成路", "right"),
      ],
    }),
  },
  {
    label: "白涧 / 三河 · 环岛",
    figure: "图 206",
    design: design("roundabout", {
      destinations: [
        row("白涧", "upperLeft"),
        row("三河", "upperRight", "", {
          content: "route",
          routeCode: "S304",
          routeType: "provincial",
        }),
        row("唐山", "left", "", {
          content: "route",
          routeCode: "G102",
          routeType: "national",
        }),
        row("双塔", "right"),
      ],
    }),
  },
  {
    label: "大厂 / 燕郊",
    figure: "图 207",
    design: design("direction", {
      destinations: [row("大厂"), row("燕郊", "right")],
    }),
  },
  {
    label: "东莞 / 深圳 · 车道",
    figure: "图 208",
    design: design("laneGuidance", {
      destinations: [row("东莞"), row("深圳", "right")],
    }),
  },
  {
    label: "巢湖 / 芜湖 · 箭杆编号",
    figure: "图 B.1 b",
    design: design("wideTJunction", {
      cardinal: "南",
      cardinalSide: "right",
      destinations: [
        row("巢湖 芜湖", "straight", "", {
          content: "route",
          routeCode: "G329",
          routeType: "national",
          onArrow: true,
        }),
        row("庐江", "right", "", {
          content: "route",
          routeCode: "S226",
          routeType: "provincial",
          onArrow: true,
          endpointRouteCode: "S206",
        }),
      ],
    }),
  },
  {
    label: "南直路 / 八一路 / G101",
    figure: "图 213 a",
    design: design("distance", {
      destinations: [
        row("南直路", "straight", "2"),
        row("八一路", "straight", "15"),
        row("", "straight", "25", {
          content: "route",
          routeCode: "G101",
          routeType: "national",
        }),
      ],
    }),
  },
  {
    label: "如皋 / 海安 / 盐城",
    figure: "图 213 b",
    design: design("distance", {
      destinations: [
        row("如皋", "straight", "5"),
        row("海安", "straight", "40"),
        row("盐城", "straight", "105"),
      ],
    }),
  },
  {
    label: "采育 / 廊坊 / 天津",
    figure: "图 260 a",
    design: design("distance", {
      green: true,
      destinations: [
        row("采育", "straight", "14"),
        row("廊坊", "straight", "37"),
        row("天津", "straight", "95"),
      ],
    }),
  },
  {
    label: "瑭塘 / G42 / 上海",
    figure: "图 260 b",
    design: design("distance", {
      green: true,
      destinations: [
        row("瑭塘", "straight", "8"),
        row("", "straight", "17", {
          content: "route",
          routeCode: "G42",
          routeType: "nationalExpressway",
        }),
        row("上海", "straight", "25"),
      ],
    }),
  },
  {
    label: "人民路 / 东环路 / 苏州新区",
    figure: "图 261 b",
    design: design("distance", {
      green: true,
      destinations: [
        row("人民路", "straight", "7", { content: "roadName" }),
        row("东环路", "straight", "17", { content: "roadName" }),
        row("苏州新区", "straight", "30"),
      ],
    }),
  },
];
