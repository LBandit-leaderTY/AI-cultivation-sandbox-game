
# AI修仙沙盒游戏

基于《凡人修仙传》世界观的AI纯文本沙盒游戏，通过大语言模型驱动沉浸式修仙体验。

## ✨ 特性

- 🎭 **完全自定义角色** - 姓名、种族、灵根、境界自由定义
- 🤖 **AI驱动剧情** - 大模型生成连贯、沉浸式的修仙世界
- 💾 **多存档系统** - 支持多存档管理，随时保存/加载
- 🔄 **智能对话压缩** - AI精简历史对话，保留核心信息
- 👥 **动态NPC系统** - 可配置NPC数量，每个NPC有独立情感和好感度
- ⏳ **时间/寿元系统** - 真实的时间流逝、寿命管理和境界修炼
- 🎨 **多主题支持** - 多种界面主题可选

## 🛠️ 技术栈

- **React 18.3** + **TypeScript** - 前端框架
- **Vite 6.4** - 构建工具
- **Zustand** - 状态管理
- **TailwindCSS** - 样式方案
- **React Router** - 路由管理

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm / pnpm / yarn

### 安装依赖

```bash
npm install
# 或者
pnpm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 即可开始游戏。

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
src/
├── pages/           # 页面组件
│   ├── Home.tsx         # 首页
│   ├── ThemeSelect.tsx  # 主题选择
│   ├── CharacterCreate.tsx  # 角色创建
│   ├── Game.tsx         # 游戏主界面
│   ├── SaveLoad.tsx     # 存档管理
│   └── Settings.tsx     # 设置页面
├── store/           # Zustand状态管理
│   ├── gameStore.ts
│   └── configStore.ts
├── services/        # 业务服务
│   └── gameService.ts     # AI游戏逻辑
├── prompts/         # 提示词文件
│   ├── cultivation-core.md  # 核心系统提示词
│   └── cultivation-v3.1.md   # 完整世界观提示词
├── types/           # TypeScript类型定义
├── utils/           # 工具函数
└── App.tsx          # 应用入口
```

## 🎮 使用说明

1. 启动应用后，点击"开始游戏"
2. 选择主题（可选）
3. 创建角色，设定姓名、种族、灵根、境界等
4. 进入游戏，输入指令与AI互动
5. 随时保存/加载游戏进度

## 🌟 技术亮点

### 分层提示词设计
- 核心系统提示词（~1500字）常驻作为System Message
- 世界观详情按需加载
- NPC情感标签动态生成

### 增强的JSON解析
- Few-shot示例强化格式
- 多层容错机制
- 字段自动补全
- 类型安全验证

### Token优化策略
- AI智能对话压缩
- 提示词分层注入
- 高效结构化输出
- 可配置NPC限制

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📧 联系方式

如有问题或建议，欢迎提交Issue。

