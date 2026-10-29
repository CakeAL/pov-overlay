# SVG 自定义

[返回 README](../README.md)

## 制作与导入

1. 新建 UTF-8 编码的 `.svg` 文件，设置 `viewBox`，用 SVG 绘制文字与图形。
2. 将需要动态更新的内容写成 `{$Speed}` 等字段；字段及单位见下表。
3. 在左侧「画布元素」导入 SVG，再调整位置、大小、字体与配色。
4. 播放 GPX 检查字段变化；保存预设可保留模板与布局。

内置范例位于 [ui/examples/](../ui/examples/)，可复制修改后导入。元素默认透明，SVG 自带的背景与布局由模板决定。

## 示例与字段

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120">
  <text x="20" y="70" font-size="48" fill="{$Color}">{$Speed} km/h</text>
  <g opacity="{$HasHeading}" transform="rotate({$Heading} 430 60)">
    <path d="M430 30 L415 80 L430 70 L445 80Z" fill="white"/>
  </g>
</svg>
```

| 字段                           | 含义                               |
| ------------------------------ | ---------------------------------- |
| `{$Speed}`                     | km/h，一位小数                     |
| `{$Latitude}` / `{$Longitude}` | WGS84 十进制度，六位小数           |
| `{$LatitudeDirection}` / `{$LongitudeDirection}` | 绝对值坐标、度号及 N/S、E/W 后缀；缺失时显示 `—` |
| `{$CompassOffset}` | Minecraft 指南针贴图的水平帧偏移（32 帧，每帧 16px）；无航向时配合 `{$HasHeading}` 隐藏 |
| `{$Elevation}`                 | 海拔米，一位小数                   |
| `{$Heading}`                   | 正北为 0° 的航向，一位小数         |
| `{$Distance}`                  | 累计公里，两位小数，不计跨断档距离 |
| `{$RemainingDistance}` / `{$TotalDistance}` | 剩余/总里程（km） |
| `{$RemainingTime}` / `{$TotalTime}` | 剩余/总 GPX 记录时间（不是预测到达时间） |
| `{$Progress}` | 已完成记录时间百分比（0–100），断档继续变化 |
| `{$ProgressRatio}` / `{$ProgressPercent}` | 时间进度 0–1 / 0–100 的高精度图形数值 |
| `{$DistanceProgress}` | 已知里程百分比，缺少 GPS 时保持最近距离 |
| `{$Elapsed}`                   | 当前播放时间                       |
| `{$Timestamp}`                 | 当前快照的 UTC ISO 时间            |
| `{$Color}`                     | 元素强调色                         |
| `{$HasData}` / `{$HasHeading}` | 1 或 0，可用于透明度               |
| `{$Province}` / `{$City}` / `{$District}` | 当前省、市、区名称 |
| `{$Street}` / `{$Road}` | 行政街道 / 当前道路名称，两个独立字段 |
| `{$HasAddress}` | 有地址结果时为 1，否则为 0 |
| `{$HasSpeed}` | 速度有效时为 1；未获得足够定位或速度无效时为 0 |

SVG 保留 viewBox、局部渐变和样式；脚本、HTML、外部资源与事件处理器会被清理。模板以独立 SVG 图片渲染，样式不影响编辑器。上限 2 MB。

字体选择展开后直接搜索并选取，使用 Hikari 原生选择面板、搜索框与菜单。字体、粗体和斜体覆盖直接写到文字节点，避免模板内联样式使选择不生效；未设置的字重、颜色与相对字号仍保留。字体需安装在当前电脑，已转为路径的文字仍保持原字形。

数据条参考了用户提供的 [gpxutil](https://github.com/DingJunyao/gpxutil) 画面布局方向，自行实现了方向、经纬度、时间、距离、海拔、速度字段，不包含道路名称或逆地理编码。

## 动态图形范例

指针时速表与速度进度条位于「运动」，进度环位于「行程」；每个范例卡片可打开源文件位置，已导入 SVG 也可在右侧属性标题处打开源文件位置。原文件失效或发行版没有源码目录时，在配置目录生成可查看的 SVG 副本；浏览器模式下载源码。范例源文件位于 `ui/examples/`，可自行修改后导入。

另提供数字时速、胶囊时速、山形海拔和方括号经纬度样式。导航分类中的经纬度默认为纬度在上、经度在下，并按坐标显示 N/S、E/W；原始十进制度字段保持兼容。Minecraft 指南针使用内嵌的 Java Edition 1.21.5 原版像素贴图，32 帧按当前航向选择（正北 0°、正东 90°），缺少可靠航向时隐藏，不虚构方向；预览和视频导出均不下载贴图。素材来源见 [ASSETS.md](../ui/examples/ASSETS.md)。

SVG 通过数值字段控制几何图形，不执行 JavaScript 或任意表达式：

- `{$SpeedRatio}`：当前速度 / 元素「速度满刻度」，限制在 0–1，适合 `scale({$SpeedRatio} 1)`。
- `{$SpeedPercent}`：0–100，适合路径 `pathLength="100" stroke-dasharray="{$SpeedPercent} 100"`。
- `{$SpeedAngle}`：−90° 到 +90°，适合以中心点旋转半圆时速表指针。
- `{$SpeedColor}`：满刻度 50% 以下绿色、50–80% 黄色、80% 以上红色。
- `{$HasSpeed}`：速度缺失时为 0；图形用它控制透明度，文字速度仍显示 `—`。
- `{$ProgressPercent}`：行程时间百分比，用于圆环 `stroke-dasharray`；GPX 断档时继续前进。数字标签可用 `{$Progress}`，按已知距离统计时用 `{$DistanceProgress}`。

满刻度默认 60 km/h，每个元素可独立调整。速度超过满刻度时图形停在最大值，数字继续显示真实速度。静态打开范例不会自动采样，动态字段由本应用在预览和导出时替换。
