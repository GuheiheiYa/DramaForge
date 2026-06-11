# 项目导航

## 目录结构

```
DramaForge/
├── app/                          # 前端应用 (React + Vite)
│   ├── public/                   # 静态资源
│   │   └── mockup.html           # Chat Studio 设计 mockup
├── backend/                      # 后端应用 (Python + FastAPI)
│   ├── app/
│   │   ├── api/v1/               # API 路由
│   │   │   ├── projects.py       # 项目管理
│   │   │   ├── scripts.py        # 剧本管理
│   │   │   ├── characters.py     # 角色管理
│   │   │   ├── storyboards.py    # 分镜管理
│   │   │   ├── generation.py     # 生成任务
│   │   │   ├── skills.py         # SKILL 管理
│   │   │   └── pipeline.py       # Pipeline + AI 对话
│   │   ├── services/             # 业务服务
│   │   │   ├── llm_service.py    # LLM 调用封装
│   │   │   └── pipeline_service.py # Pipeline 编排
│   │   ├── models/schemas.py     # Pydantic 数据模型
│   │   ├── core/celery_app.py    # Celery 配置
│   │   ├── tasks/pipeline_runner.py # 异步任务
│   │   ├── config.py             # 配置管理
│   │   └── main.py               # FastAPI 入口
│   ├── requirements.txt          # Python 依赖
│   └── .env.example              # 环境变量模板
│   ├── src/
│   │   ├── components/           # 公共组件
│   │   │   ├── ui/               # shadcn/ui 基础组件（40+）
│   │   │   ├── AIPanel.tsx       # AI 助手面板（独立组件）
│   │   │   ├── AppSidebar.tsx    # 侧边栏导航
│   │   │   ├── AppTopbar.tsx     # 顶部栏（搜索/通知/帮助）
│   │   │   ├── ConfirmDialog.tsx # 确认弹窗
│   │   │   ├── Layout.tsx        # 全局布局（侧边栏+顶栏+内容区）
│   │   │   ├── ProgressPanel.tsx # 生成进度面板
│   │   │   ├── ProjectCard.tsx   # 项目卡片
│   │   │   ├── StatusBadge.tsx   # 状态标签
│   │   │   └── ToastProvider.tsx # Toast 提供者
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── use-mobile.ts     # 移动端检测
│   │   │   └── useToast.ts       # Toast 封装
│   │   ├── lib/                  # 工具函数
│   │   │   └── utils.ts          # cn() 等通用工具
│   │   ├── pages/                # 页面组件
│   │   │   ├── AssetLibrary.tsx      # 素材库 [F-007]
│   │   │   ├── CharacterManager.tsx  # 角色管理台 [F-003]
│   │   │   ├── ComposerStudio.tsx    # 成片合成室 [F-005]
│   │   │   ├── CostStatistics.tsx    # 成本统计 [F-009]
│   │   │   ├── Dashboard.tsx         # 项目工作台 [F-001]
│   │   │   ├── GenerationHistory.tsx # 生成记录 [F-008]
│   │   │   ├── ScriptEditor.tsx      # 剧本编辑器 [F-002]
│   │   │   ├── SkillMarket.tsx       # SKILL 市场 [F-006]
│   │   │   ├── StoryboardWorkbench.tsx # 分镜工作台 [F-004]
│   │   │   ├── Chat.tsx              # AI 对话 / Chat Studio [F-011][F-012]
│   │   │   ├── character/            # 角色管理台子组件
│   │   │   ├── composer/             # 成片合成室子组件
│   │   │   ├── script/               # 剧本编辑器子组件
│   │   │   ├── skill/                # SKILL 市场子组件
│   │   │   └── storyboard/           # 分镜工作台子组件
│   │   ├── store/                # Zustand 状态管理
│   │   │   ├── useAppStore.ts    # 全局应用状态（项目列表、UI 状态）
│   │   │   └── useChatStore.ts   # 聊天状态（会话、消息、模型、SKILL）
│   │   ├── App.tsx               # 路由配置
│   │   ├── main.tsx              # 应用入口
│   │   └── index.css             # 全局样式
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── AI漫剧Agent调研/               # 技术调研文档
│   └── ai_drama_agent_research.md
├── docs/                         # 项目文档
│   ├── requirements.md           # 需求文档
│   ├── features.md               # 功能文档
│   ├── issues.md                 # 问题追踪
│   ├── design.md                 # 设计概览
│   ├── design/                   # 功能级设计方案
│   │   └── chat-studio-design.md # [D-001] Chat Studio 设计
│   ├── navigation.md             # 项目导航（本文件）
│   ├── changelog.md              # 更新日志
│   └── git-commits.md            # Git 提交索引
├── info.md                       # 技术调研报告
└── plan.md                       # 项目实施计划
```

## 路由一览

| 路径 | 页面 | 侧边栏分组 |
|------|------|-----------|
| `/` | 项目工作台 | 创作 |
| `/chat` | AI 对话 / Chat Studio | 创作（新建会话按钮） |
| `/script` | 剧本编辑器 | 创作 |
| `/characters` | 角色管理台 | 创作 |
| `/storyboard` | 分镜工作台 | 创作 |
| `/composer` | 成片合成室 | 创作 |
| `/skills` | SKILL 市场 | 资源 |
| `/assets` | 素材库 | 资源 |
| `/history` | 生成记录 | 管理 |
| `/cost` | 成本统计 | 管理 |
| `*` | 重定向到 `/` | — |

## 页面跳转关系

```
Dashboard ──点击项目──→ ScriptEditor
    │                      │
    │                  AI助手面板
    │                      │
    ├──→ Chat ──AI生成──→ 右侧面板预览 ──完成──→ ComposerStudio / ScriptEditor / StoryboardWorkbench
    │
    ├──→ CharacterManager
    ├──→ StoryboardWorkbench
    ├──→ ComposerStudio
    ├──→ SkillMarket
    ├──→ AssetLibrary
    ├──→ GenerationHistory
    └──→ CostStatistics

AppSidebar
    ├── 新建会话按钮 ──→ Chat（创建新会话）
    └── 历史会话折叠 ──→ Chat（切换会话）

AppTopbar
    ├── 搜索框 ──→ Dashboard
    ├── 通知铃铛 ──→ 通知面板
    ├── 新建按钮 ──→ Dashboard / CharacterManager / SkillMarket
    └── 帮助按钮 ──→ 快捷键弹窗 / 文档 / 反馈
```
