# POV Overlay

本地 GPX 视频叠加层编辑器。前端采用 **Vue 3 + TypeScript + Hikari**，桌面端采用 **Tauri 2 + Rust**。

当前版本专注于排布与预览，不合成或导出视频。

## 启动

要求 Node.js 22.12+（或支持 Vite 7 的更新版本）、Rust stable，以及 [Tauri 系统开发依赖](https://v2.tauri.app/start/prerequisites/)。

```sh
npm ci
npm run tauri dev
```

只启动浏览器开发预览：

```sh
npm run dev
```

访问 `http://127.0.0.1:1420`，导入自己的 GPX 与预览视频。

## 当前功能

- 导入 GPX 与本地预览视频；支持任意导入顺序和文件拖放。
- 右侧画布上的速度、经纬度组件可自由拖动、缩放、显示/隐藏、锁定。
- 可调整位置百分比、大小、背景透明度、强调色；支持中心吸附与安全边距。
- 支持撤销/重做、方向键逐像素微调，Shift + 方向键移动 10 像素。
- 播放/暂停、拖动时间轴、静音、回到视频起点；Space 切换播放。
- 按视频时间采样 GPX，速度显示为 km/h；经纬度保留 WGS84，不自动转换为 GCJ-02。

## 自动时间对齐

计算方式：

```text
偏移秒数 = (视频起始时间 − GPX 起始时间) / 1000
当前 GPX 时间 = GPX 起始时间 + 偏移秒数 × 1000 + 视频播放时间 × 1000
```

正偏移表示视频开始于 GPX 记录之后；负偏移表示视频先于 GPX 开始。偏移可为小数。

桌面端优先通过可选的 `ffprobe` 读取 QuickTime 拍摄时间、容器/视频流 `creation_time`，保留时区与毫秒。没有 `ffprobe` 时仍可直接读取 MP4/MOV 的 `mvhd` 时间，并通过系统 WebView 播放视频。浏览器开发模式读取 MP4/MOV 的 `mvhd` 时间。读取大型文件时只读取元数据块，不把整段视频载入内存。

- 时间戳统一换算为 UTC；界面中的日期与手动输入使用当前系统时区。
- 缺少有效拍摄时间时明确提示，并允许手动填写视频起始时间或设置偏移；不使用文件修改时间猜测。
- 元数据可能是剪辑、转码或设备时钟设置产生的时间，用户可手动校准。
- 超出 GPX 覆盖范围、跨轨迹段或相邻点相隔超过 30 秒时显示 `—`，不保持旧读数或跨断档插值。
- GPX 支持多个 `trk/trkseg`，要求至少两个有效的带时间戳轨迹点；排序并忽略重复时间和缺少时间的点。
- 视频播放能力取决于系统 WebView 与解码器，建议使用 H.264 MP4。这个版本不自动转码。

macOS 可选安装元数据增强工具：

```sh
brew install ffmpeg
```

## 工程结构

```text
ui/
  App.vue                页面组装与依赖注入
  editor/                编辑器组合入口、类型化上下文
  components/
    shell/               应用头部与消息提示
    inspector/           素材、同步、图层、属性面板
    canvas/              画布工具栏、预览、播放控制
    widgets/             速度、经纬度与可拖动组件外壳
  composables/           按功能独立的状态与交互控制器
  domain/                数据模型、轨迹采样与纯计算
  infrastructure/        浏览器/Tauri 素材访问、GPX 与 MP4 解码
  lib/                   展示格式化工具
  styles/                按界面职责划分的样式
  tests/                 前端回归测试
src-tauri/
  src/
    main.rs              二进制入口
    lib.rs / app.rs      模块装配与 Tauri 启动
    commands/            IPC 适配、后台调度、WebView 文件授权
    application/         GPX 导入、视频导入、字幕与地图用例
    domain/              轨迹模型、速度/时间采样、时间对齐
    infrastructure/      GPX 解码、文件系统、ffprobe、MP4、SRT、地图渲染
  tests/                 不依赖个人文件或网络的集成测试
Cargo.toml / Cargo.lock  唯一的 Cargo workspace 与依赖锁
```

界面组件只负责展示和事件绑定；composables 按素材、对齐、播放、画布尺寸、组件布局、时间轴、快捷键与文件拖放分别管理状态。`editor/createEditor.ts` 只组合这些控制器，`editor/context.ts` 向组件提供类型化上下文。

Rust 依赖方向为 `commands → application → domain / infrastructure`，基础设施实现依赖领域类型，领域层不依赖 Tauri、文件系统或命令层。所有 Rust 源码已统一迁入 `src-tauri`，根 `src/` 与独立的 `pov-core` 工程已合并。

原有 SRT 功能位于 `application/subtitle_export.rs`，以显式输出路径调用；地图实验位于 `infrastructure/map_renderer.rs`，通过可选的 `map-rendering` feature 启用，地图 I/O 不再放在轨迹点模型里。这些库功能不作为编辑器的合成导出入口。

桌面导入使用 Rust 解析 GPX。浏览器开发模式保留 TypeScript 解析适配；两者均有覆盖重复点、断档、时区与跨日期变更线的测试。播放逐帧更新在前端完成，不进行逐帧 IPC。

Hikari 采用官方 Vue 源码包，按需引入组件和样式，并使用 Vue JSX 插件编译 TSX。版本由 `package-lock.json` 锁定。

当前不提供项目持久化、视频导出、地图底图或 HEVC 预览代理生成。关闭页面前的布局不会自动保存。

## 检查

```sh
npm run build
npm test
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo check --workspace --all-features
```

测试使用内存数据或临时文件，不依赖个人下载目录、示例素材或在线地图。
