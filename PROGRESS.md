# CV 網站 — 進度

**最後更新:** 2026-08-05(夜晚:scroll-world 改成每個 project 一疊 + SEO 收尾)
**技術棧:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + next-intl + next-themes

## 目標
把 `CV.pdf` 做成一個網站,等 HR / 面試官喺 desktop 同手機都睇得舒服;
另外用真實系統嘅截圖同「解說式」scroll 動畫做 Portfolio。

## 已完成 ✅

### 基本網站
- Next.js 16 專案 scaffold(`src/` + App Router + Tailwind v4),`CV.pdf` 原檔保留
- `scripts/render-pdf-pages.mjs`:用 macOS PDFKit(JXA)render CV.pdf p.3–9 → `public/portfolio/*.jpg`
- `scripts/capture-schedule.mjs`:借用 `../schedule_project` 現成 e2e harness 影 desktop + mobile 各 9 張
- 內容分層:`src/data/cv.ts` 只放結構,文字全部喺 `messages/en.json` 同 `messages/zh-HK.json`
- i18n(`en` / `zh-HK`,`src/proxy.ts` + next-intl)、深淺色主題、RWD、`@media print`
- Backend:`GET /api/cv?locale=`、`GET /api/cv/download`

### Scroll-world(今次大改)
- **由「/portfolio 開場兩幕」改成「每個 project 一疊」** —— `PROJECT_WORLDS` / `INTRO_WORLD`
  (`src/data/world.ts`),`ScrollWorld` 收 `scenes` + `seenKey` prop,
  `WorldStage` 管「一 session 播一次 + 重播」(取代舊 `PortfolioIntro`)
- **重心放喺解說段**:schedule 現時三幕 = 1 短真 UI(`schedule-tour`)+ 2 解說
  (`schedule-tenancy` 多租戶 / QR,`schedule-booking` 報名→名額→老師課表→Stripe)
- **修好尾段**:以前場景鋪滿成條 track,但 sticky 舞台只行得 `track − stage` 咁高,
  所以最後一幕仲係 100% 不透明就已經被刮走(= 之前見到嘅「半截白板」)。
  而家 `layout()` 用舞台自己嘅高度做 vh,場景只佔 `travel − outro`,再加 0.6vh outro band 整體淡出
- **copy 可讀性**:改成「快速淡入 + 保持全不透明」,in-ramp 用未 clamp 嘅位置(提早 10% 開始),
  兩幕之間唔會再有成半個螢幕冇字;scrim 加深加高(手機 46% / 桌面 55%)
- **Skip / 進度指示** 由 `top-4` 移去 `top-20`,唔再被 sticky header 蓋住
- **手機直度另一套排版**(`scenes/scene.css` 嘅 portrait block):收起 titlebar 同 log、
  卡片收窄、booking 摺成 2×2、tenancy 淨係留 slug、內容壓喺 frame 頂 12%–60%
- 資產 pipeline 泛化:`scenes/manifest.mjs` 做單一清單,capture / encode 兩個 script 照住行,
  支援 `--force` / `--only=id,id`;clip 改用 id 命名(`/world/<id>.mp4`)
- `scenes/scene.css` 抽走共用骨架,新場景只需寫自己嗰部分

### SEO
- `src/app/sitemap.ts`(兩 locale × 6 條路徑,由 `routing.locales` + `PROJECTS` 生成)
- `src/app/robots.ts`
- `src/app/[locale]/opengraph-image.tsx`(next/og,深色底;**故意淨係用拉丁字**,
  因為 next/og 內建字型冇 CJK,為一張分享圖 ship 中文字型唔值)
- `layout.tsx` 補 `metadataBase` / `alternates` / `openGraph` / `twitter`
- `src/site.ts`:`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → localhost

### 工具
- `.shot.mjs` / `.world-check.mjs` 收入 `scripts/`,加 `npm run check:world` / `npm run shot`
- `.gitignore` 加 `/.shots`(驗收截圖)同 `/_material`(未入版本控制嘅專案素材)
- Agent IT team(`.claude/agents/`,9 個)+ `.claude/settings.json` deny list / change-log hook

## 未做 / 下一步 ⬜

- [ ] **OTTO / CMHK Kiosk / Startie 三個 project 嘅 scroll-world** —— 等素材。
      放喺 `_material/<slug>/`(已 gitignore),三選一:
      1. source code 路徑(最好,可以照 schedule 咁影真 UI)
      2. 測試環境 URL + 帳號(⚠️ 只影假 / 測試資料,真實公司資料唔上網)
      3. 高清截圖 / 錄影
      冇料都做得 —— 照 `scenes/agents.html` 嗰套砌 HTML 解說段
- [ ] 部署(Vercel),記住設 `NEXT_PUBLIC_SITE_URL`
- [ ] `git init` + 首次 commit(而家仲未係 git repo)
- [ ] `public/cv/Kevin_Wu_CV.pdf`(4.5MB)+ `public/world/`(11MB,其中 `schedule-tour`
      兩個 clip 就佔咗 6MB —— 佢係真 UI 截圖,壓縮率遠差過解說段)要唔要壓細

## 已知問題 / 風險 ⚠️
- **`next dev` 唔會熱載入 `messages/*.json`** —— 改完文案見到 raw key 就係呢個原因,
  要重開 dev server;驗收用 `npx next start` 行 production build 最穩陣
- `npm run assets:world` 入面 `schedule-tour` 要 PostgreSQL + `../schedule_project`;
  CI / Vercel **唔會**跑,所以 `public/world/` 同 `public/portfolio/` 必須入版本控制
- **唔准改到 `../schedule_project` 任何檔案**(capture script 只讀、只 scroll)
- 場景 clip 一律淺色;深色主題下係「白板 + 黑色漸層」嘅觀感,係刻意選擇(唔想 double 資產)
- 兩幕交接嗰 ~140px scroll 會見到兩段字疊住淡入淡出,係 cross-dissolve,唔係 bug
- 直度場景頂部喺每幕最尾會有約 9px 被 sticky header 遮到(board 有 ±13px 漂移)
- `startie` 嘅 `ems.s7yr0.com` 已經連唔到;`otto` 嘅 `tds3.tradelinksig.com` 要 CAS 登入
- Agent 定義唔會熱載入:改完 `.claude/agents/*.md` 要重開 session

## 驗證方法
```bash
npm run build                 # typecheck + build,現時 21 條 route
npx next start -p 3001        # 驗收一定要用呢個(見上面 messages 熱載入問題)
node scripts/world-check.mjs .shots   http://localhost:3001/en/portfolio/schedule
node scripts/world-check.mjs .shots-m http://localhost:3001/en/portfolio/schedule mobile
node scripts/world-check.mjs .shots-i http://localhost:3001/zh-HK/portfolio
```
`world-check` 應該見到:
- `currentTime` 隨 scroll 單調上升,scroll 返上會跌
- `stage opacity at the seam: 0 ✓`
- `content below clickable: yes`
- `page errors: none`

其他:
- `curl -s localhost:3001/robots.txt` / `sitemap.xml` / `-I /en/opengraph-image`(要 `image/png`)
- `curl -I localhost:3001/api/cv/download` → `content-disposition: attachment`
- 兩個 locale 都唔見 raw key;手機無橫向捲動;`prefers-reduced-motion` 只見 poster
