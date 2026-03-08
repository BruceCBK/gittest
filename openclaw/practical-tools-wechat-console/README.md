# Practical Tools WeChat Console

一个面向 OpenClaw 使用者的本地控制台，聚合：
- OpenClaw 网关/配置/技能（Skills）管理
- 记忆文件（`memory/` 与 `MEMORY.md`）可视化编辑
- 自媒体选题与内容看板（飞书 / 公众号 / 小红书）
- 公众号领域推荐（实用软件 / 免费工具）与关键词检索

---

## 功能总览

### 1) OpenClaw 控制台
- 健康状态查看（`/api/health`）
- OpenClaw 状态摘要（`/api/openclaw/status`）
- 模型配置快速修改（`agents.defaults.model.primary`）
- OpenClaw 配置 JSON 编辑、格式化、保存
- Gateway 重启操作

### 2) Skills 管理
- 列出已安装技能
- 安装 / 更新 / 卸载单个 skill
- 一键更新全部 skills

### 3) 记忆管理
- 浏览 `memory/` 文件
- 读取/编辑/保存记忆文件
- 新建记忆文件

### 4) 自媒体栏
- Tab 切换：飞书 / 公众号 / 小红书
- 热门话题与文章展示（直达链接）
- Pipeline/Kanban 数据结构渲染（若数据存在）

### 5) 公众号推荐增强
- 默认按“实用软件、免费工具、效率工具、工具测评”领域推荐
- 至少返回 10 篇内容（含缓存与兜底）
- 支持关键词检索（例如：`免费 OCR`、`开源替代`）
- 展示尽可能多的数据字段：阅读、点赞、转发、收藏、在看、热度分、抓取时间、来源域名

> 注：不同来源页面结构不同，部分指标可能无法稳定提取，前端会显示 `-`。

---

## 项目结构

```text
practical-tools-wechat-console/
├─ data/
│  ├─ media-trending.json
│  └─ wechat-articles-cache.json   # 运行时缓存（可忽略）
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ package.json
├─ server.js
└─ README.md
```

---

## 环境要求

- Node.js >= 22
- npm >= 10
- 已安装并可访问 OpenClaw（默认路径见 `server.js`）

可选：
- `TAVILY_API_KEY`（用于公众号推荐的实时检索增强）

---

## 快速开始

```bash
cd openclaw/practical-tools-wechat-console
npm install
npm start
```

默认监听：
- `http://127.0.0.1:3900`
- 局域网访问：`http://<你的局域网IP>:3900`

---

## 关键 API（节选）

### 系统与配置
- `GET /api/health`
- `GET /api/openclaw/status`
- `GET /api/openclaw/config`
- `PUT /api/openclaw/config`
- `POST /api/openclaw/model-primary`
- `POST /api/openclaw/restart`

### Skills
- `GET /api/skills`
- `POST /api/skills/install`
- `POST /api/skills/update`
- `DELETE /api/skills/:slug`

### 记忆
- `GET /api/memory/files`
- `GET /api/memory/file?path=...`
- `PUT /api/memory/file`
- `POST /api/memory/file`

### 媒体
- `GET /api/media/trending`
- `GET /api/media/wechat/recommendations?q=<关键词>&limit=10`

---

## 安全与注意事项

- 请勿将 GitHub Token、API Key 明文提交到仓库。
- 生产环境建议增加认证与访问控制（当前是本地控制台场景）。
- `data/wechat-articles-cache.json` 为运行时缓存，建议加入忽略列表。

---

## 后续可扩展

- 文章“可读性/质量评分”
- 多来源聚合排序（按领域权重）
- 历史检索记录与收藏夹
- 自动化日报（定时抓取 + 卡片推送）
