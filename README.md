# XYyRadar Demo

3D 中国省级地图（ECharts GL）+ 后端按省统计性压抑帖子发帖量着色：性压抑帖子数量越多颜色越深。省级边界来自在线 GeoJSON，统计数据由本地 JSON 提供。

## 在线演示（GitHub Pages）

仓库：**[github.com/noobly0705/xyyradar-demo](https://github.com/noobly0705/xyyradar-demo)**  
推送 `main` 后由 [GitHub Actions](.github/workflows/deploy-pages.yml) 自动构建部署；也可在 Actions 里手动运行 **Deploy GitHub Pages**。

**[https://noobly0705.github.io/xyyradar-demo/](https://noobly0705.github.io/xyyradar-demo/)**

> **请用上面这个 `*.github.io` 链接看在线地图**，不要用仓库主页 `github.com/.../xyyradar-demo` 当「演示」——后者是代码仓库，没有部署好的页面。  
> Fork 后请把本段链接改成 **`https://<你的用户名>.github.io/xyyradar-demo/`**，并在本仓库 **Settings → Pages** 里用 **GitHub Actions** 作为来源（若尚未启用）。

### 为什么仓库里有的链接打开是 403？

阿里云 DataV 的 GeoJSON **直链**（`geo.datav.aliyun.com/areas_v3/bound/100000_full.json`）在浏览器 **从 GitHub 页面跳转过去** 时会带上 `Referer: github.com`，CDN 会 **403**。这与本项目的**在线演示页能否加载地图**无关：演示页已改用仓库内的 `public/geo/china-100000_full.json`，**不再请求**该阿里云地址。请勿在 README 或浏览器里用 DataV 直链做「能否访问地图」的测试。

> 若以后新建仓库需自行开启 Pages：仓库 **Settings → Pages**，**Build and deployment** 的 **Source** 选 **GitHub Actions**。部署后若短暂 404，等待工作流完成后再试。

静态站点读取仓库内构建生成的 `stats.json`（由 `npm run build` 的 `prebuild` 从 `server/data/province_counts.json` 复制）；本地完整体验后端接口请仍按下文启动 FastAPI。

## 合规说明

**请勿对微博等平台做未授权爬取**（违反服务条款且存在法律与账号风险）。本仓库仅演示「省级计数 → API → 地图着色」链路。真实数据请使用：**平台官方/授权接口**、**自有合规导出**，或按 `scripts/ingest_csv_example.py` 从已脱敏的 CSV 汇总。

## 环境要求

- Node.js 18+（用于前端）
- Python 3.10+（用于后端与数据脚本）

## 首次安装

```bash
cd xyyradar-demo
npm install

python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

## 准备数据

生成或更新 `server/data/province_counts.json`：

```bash
# 模拟数据（开发演示）
python3 scripts/mock_aggregate.py
```

若你有合规 CSV（含省份名与条数等列），可参考并改写 `scripts/ingest_csv_example.py` 写入同一 JSON 结构。

## 省级名称对齐（重要）

前端用 GeoJSON 里每个面的 **`properties.name`** 作为键，到 `counts` 里取数；**字符串必须完全一致**（含「省 / 市 / 自治区 / 特别行政区」等官方全称），否则该省在图上会当作 **0**（颜色最浅一档），不会报错。

- **地图数据来源**：`public/geo/china-100000_full.json`（与阿里云 DataV `100000_full` 同源数据；在线 CDN 在 **GitHub Pages** 等站点会因 Referer 返回 **403**，故改为随仓库静态托管）
- **白名单参考**：`scripts/mock_aggregate.py` 中的 `PROVINCE_NAMES` 已与上述 GeoJSON 常见写法对齐；也可自行下载该 JSON，遍历 `features[].properties.name` 生成合法键集合。
- **CSV / 业务侧简称**：若只有「北京」「内蒙」等简称，需在聚合脚本里做**显式映射**到全称（例如 `北京` → `北京市`），再写入 `province_counts.json`。

## 本地运行（两个终端）

**终端 1 — 后端**（须在项目根目录 `xyyradar-demo` 下执行，以便正确加载 `server` 包）：

```bash
cd xyyradar-demo
source .venv/bin/activate
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

接口：`GET http://127.0.0.1:8000/api/stats`，返回 `counts`（省名 → 整数）等字段。

**终端 2 — 前端**：

```bash
cd xyyradar-demo
npm run dev
```

开发模式下 Vite 将 `/api` 代理到 `http://127.0.0.1:8000`（见 `vite.config.ts`）。地图边界从本地 **`public/geo/china-100000_full.json`** 加载，无需再请求阿里云 CDN。

## 生产构建

```bash
npm run build
npm run preview
```

- **GitHub Pages**：CI 中设置 `VITE_BASE=/<仓库名>/`，与项目页路径一致；前端生产环境从根路径下的 `stats.json` 读取数据，无需单独托管 FastAPI。
- **自有服务器**：可部署 `dist/` 静态文件，并自行配置后端；开发时通过 Vite 代理访问 `/api/stats`。

## 主要文件

| 路径 | 说明 |
|------|------|
| `src/App.tsx` | 地图；开发环境拉取 `/api/stats`，静态部署拉取 `stats.json` |
| `server/main.py` | FastAPI，`/api/stats` |
| `server/data/province_counts.json` | 省级计数数据 |
| `scripts/mock_aggregate.py` | 写入模拟 JSON |
| `scripts/ingest_csv_example.py` | CSV 聚合示例 |

## 技术栈

React、TypeScript、Vite、ECharts、ECharts GL、FastAPI、Uvicorn。
