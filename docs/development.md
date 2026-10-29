# 开发说明

[返回 README](../README.md)

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

界面控件统一直接使用 Hikari 官方 Vue 组件：按钮、图标按钮、输入框、数字输入、选择器、复选框、开关、滑块、标签、颜色选择、菜单、弹窗、进度和通知；悬停帮助使用 Hikari 官方 tooltip bridge。字体筛选与字段插入只组织业务数据，不自制对应的输入、列表弹层或控件外观；应用样式仅负责业务布局和画布交互，主题通过 Hikari 颜色通道配置。文件选择保留隐藏的原生 file input 作为浏览器适配。

Hikari 采用官方 Vue 源码包，并使用 Vue JSX 插件编译 TSX。开发依赖预构建排除 Hikari 源码，嵌套的 CommonJS 依赖单独预构建，避免 TSX 被当作 React 编译；组件内置文案使用简体中文。版本由 `pnpm-lock.yaml` 锁定。

## 检查

```sh
pnpm build
pnpm test
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo check --workspace --all-features
```

测试使用内存数据或临时文件，不依赖个人下载目录、示例素材或在线地图。

开发约定见 [AGENTS.md](../AGENTS.md)。按改动范围选择必要检查；纯文档修改检查内容、链接与 `git diff --check`。
