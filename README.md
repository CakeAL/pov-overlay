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

访问 `http://127.0.0.1:1420`。右上角「加载示例」可以使用随项目提供的合成视频与 GPX，演示视频从轨迹第 12 秒开始的自动对齐。

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
ui/                   Vue 编辑器、Hikari 组件、时间轴与浏览器开发适配
crates/pov-core/      纯 Rust GPX 解析、采样、时间对齐；不依赖桌面 UI
src-tauri/            桌面壳、文件访问、视频元数据读取
public/demo/          合成示例视频与 GPX（无真实用户数据）
src/                 原有 Rust GPX/SRT/地图实验，继续保留
```

桌面导入通过 Rust `pov-core` 解析 GPX。浏览器开发模式提供等价的 TypeScript 解析适配；两者均有覆盖重复点、断档、时区与跨日期变更线的测试。播放逐帧更新在前端完成，不进行逐帧 IPC。

Hikari 采用官方 Vue 源码包，按需引入组件和样式，并使用 Vue JSX 插件编译 TSX。版本由 `package-lock.json` 锁定。

当前不提供项目持久化、视频导出、地图底图或 HEVC 预览代理生成。关闭页面前的布局不会自动保存。

## 检查

```sh
npm run build
npm test
cargo test --manifest-path crates/pov-core/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

原有 `src/` 中的实验测试依赖个人下载目录和网络；上面的新测试均使用自包含数据。
