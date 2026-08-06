# CV 網站 — 進度

**最後更新:** 2026-08-06(schedule-tour 重影:六段鏡頭剪接 + 全套英文)
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

- **`/portfolio` 開場由一幕變兩幕**(合共 4.0vh,舊版 1.8vh,慢咗一倍以上):
  `agents` = 九個角色排開 → dispatcher 揀角色 → 難度→model 對照表亮起選中嗰行;
  `agents-handoff` = developer 交棒 tester(有粒 token 行過去)→ 三項檢查逐項變綠 → 「ready to commit」
- **WorldStage 個「重播」掣改置中** —— 收埋動畫之後淨返佢一個,貼住左邊好似排版出錯
- **`/portfolio` 開場改成自動播**(`AutoWorld`,`WorldStage mode="auto"`):
  一個螢幕高、自己由頭播到尾、頂部有進度條、播完停喺最後一格並保留文字。
  Project 詳情頁維持 scroll 拖動(`ScrollWorld`)。
  注意個 section 要用 `h-[calc(100svh-4rem)]` —— 純 `h-svh` 由 header 底計起,
  會超出視窗 4rem,文字尾幾行被切走
- **手機 footer 唔再被底部行動列蓋住** —— `SiteFooter` 改 client component,
  只喺 CV 頁(有 `MobileActionBar` 嗰版)預留 `5.5rem + safe-area` 底部空間
- **導覽錨點唔再彈返頂** —— `href` 由 `/#skills` 改成 `#skills`。
  前者係另一個 URL,瀏覽器會導航、落返頂,先再滑落去
- **`localeDetection: false`** —— 一律先入英文,唔再跟瀏覽器 Accept-Language
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

### schedule-tour 重影(2026-08-06)
- **由「一鏡直落一版」改成六段鏡頭剪接**(`scenes/manifest.mjs` 嘅 `shots`):
  公司目錄 → 公司頁月曆 → 課程詳情/報名 → 老師後台課程表 → 公司 QR → 平台 admin。
  舊版 140 格全部喺一版公司頁由頂掃到底,中段成半條片係聯絡資料卡 + Leaflet 地圖
- **`shots[].from` / `to` 係取景窗**(CSS selector → document 座標)。公司頁由 `.row-between`
  起鏡,所以上面嗰塊地圖**根本冇入鏡** —— 唔使改 DOM,淨係唔影佢
- 大部分頁喺 1280×720 一版就裝得晒,所以**動感嚟自剪接而唔係 pan**。每段 frames 都係
  桌面 GOP(8)嘅倍數,令每個切口啱啱落喺 keyframe,scrub 過切口唔會糊
- 資料庫由 dev DB `schedule_app` 改用 **e2e seed DB `schedule_app_e2e`** —— 可重現,
  而且同 `public/portfolio/schedule/` 嗰 18 張截圖同一套資料
- **影 `starlight-dance` 而唔係 `abc-music`**:每間公司自己揀 template,ABC 用 `stage`
  (深紫),Starlight 用 `studio`(米白 + 淡紫 + Playfair)。其他五幕都係淺色,
  所以跟返淺色嗰間。改 `capture-world-frames.mjs` 個 `TENANT`(slug + 課程 id + 老師帳號)
  一個地方就轉得晒;`loginTeacher(page, owner)` 收 owner,`CREDENTIALS.owners` 按 slug 排
- **UI 切英文**,連 seed 出嚟嘅示範資料一齊(`scripts/lib/demo-en.mjs`):
  seed 完即刻 `UPDATE` 一輪,`ABC 音樂教室` → `ABC Music Academy`、`兒童鋼琴入門` →
  `Piano for Kids`,人名羅馬拼音對返 email。**唔係喺 DOM / 相片上加工**
- 兩道守尾門:`assertDbEnglish()` 掃勻 DB 每個 text / jsonb 欄位,`assertNoCjk(page)`
  每段開拍前掃畫面;仲有中文就拒絕拍
- `scripts/lib/schedule-app.mjs`:seed / 英文化 / 開 API+Vite / 三種身分登入,
  `capture-schedule.mjs` 同 `capture-world-frames.mjs` 共用(以前兩邊各抄一份)
- 18 張相簿截圖亦一齊重影成英文(仍然影 ABC,見下面「已知問題」)
- `src/data/world.ts` 嘅 `scroll` 0.9 → 1.3(六段鏡頭塞落 0.9vh 太快)
- 檔案細咗:`schedule-tour.mp4` 3.4MB → 1.6MB,`-m` 2.5MB → 2.1MB

### 滑鼠特效
- `src/components/PointerFx.tsx`(render `null`)—— 全站唯一嘅指標追蹤器,
  一個 `pointermove` + rAF 合併,寫 `--px/--py`(視窗)同 `--cx/--cy`(hover 嗰張卡)。
  只喺 `(hover:hover) and (pointer:fine)` **而且**唔係 `prefers-reduced-motion` 先啟用,
  啟用時喺 `<html>` 落 `data-pointer="fine"`;所有 CSS 由呢個 attribute 開關,
  觸控 / 減少動態嘅使用者連 listener 都唔會裝
- **背景網格聚光燈**(`body::after`):一塊 520px 固定層用 `transform` 移動(合成器處理),
  網格 `background-position` 反向補償,令線條同 `body::before` 嗰個靜態網格對齊 ——
  否則會變成「多咗一個網格喺度飄」。**唔用全螢幕 mask**,嗰個做法每幀重繪成個視窗
- **卡片聚光 + 邊框發光**(`[data-spotlight]`):`isolation: isolate` + `z-index: -1`,
  令光暈畫喺卡片底色之上、文字之下(用正 z-index 就會冚住字)。
  邊框環用 `mask-composite: exclude`,包咗 `@supports`,唔支援就淨係冇個環
- 六處卡片掛咗 `data-spotlight`:portfolio 卡、skills、experience、education、
  profile aside、gallery 格
- 光暈強度 light / dark 分開寫(`--fx-halo/line/card/ring`)—— dark 個 accent 係光青色,
  同一個百分比會刺好多
- 實測:120 次連續 mouse move **冇 long task**;手機同 reduced-motion 兩邊
  `body::after` 嘅 `content` 都係 `none`(層都冇建立)

### OTTO(TDS eDOC)三幕
- `otto-tour` —— **真 UI**,由你自己登入嘅 Chrome 經 CDP 拍(密碼唔經 repo)
- `otto-flow` / `otto-control` —— 解說段,內容由 `_material/otto/repo` 讀返嚟
  (SPI + 實作分模組、一個貨代一個 out-channel factory、獨立嘅 rule-driven 序號產生器
  連檢查碼、380 個 XSL、`OttowebUI.java` 7,883 行)
- capture script 加咗 `kind: 'remote'`:接 CDP、**借用你已登入嗰個 tab**
  (呢個 app 嘅 session 綁 URL,開新 tab 會彈返登入頁)、認得 frameset
  (內容喺 `main-frame`,而且要捲 `.ui-jqgrid-bdiv` 唔係 document)
- **匿名化**:拍之前就地改字,唔係事後打格。
  - 具名規則(公司名、party ID)+ 長數字遮蔽(對付 `3HKTLK…48968…` 呢類複合鍵)
  - **整欄覆蓋** Office / Customer Code / Party ID Name —— 黑名單漏咗
    `Oi MELCOSA` / `OAGN` / `MANTRA EXPORTS`,所以改用「呢幾欄一律換走」
  - `forbidden` 清單守尾門,任何一個仲喺頁面就**拒絕拍**
  - jqGrid 捲動會重畫行,所以**每一格截圖之前**都重跑一次
- 拍攝 viewport 對齊顯示比例(桌面 1728×1080、手機 1200×2133),`object-cover` 冇嘢好裁
- `encode-world-clips.mjs`:修好 keyframe 統計(ffprobe 帶尾逗號,一直報 0),
  加 per-scene `crf`(真 UI 截圖比手畫解說段重幾倍)

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
- [ ] **決定 schedule 一頁用邊間學校**:條片係 Starlight(淺色),相簿 18 張仍然係 ABC(深色)。
      三選一 —— 兩邊都轉 Starlight(要重影 18 張,但會失去 ABC 嗰啲報名資料)/
      條片轉返 ABC(舊 mp4 已經冇備份,要重拍)/ 維持而家咁,當「唔同學校唔同樣」嚟賣
- [ ] 部署(Vercel),記住設 `NEXT_PUBLIC_SITE_URL`
- [ ] `public/cv/Kevin_Wu_CV.pdf`(4.5MB)+ `public/world/`(~9MB,最重係 `otto-tour`
      兩個 clip 佔 5.9MB —— 真 UI 截圖壓縮率遠差過解說段)要唔要壓細

## 已知問題 / 風險 ⚠️
- **`next dev` 唔會熱載入 `messages/*.json`** —— 改完文案見到 raw key 就係呢個原因,
  要重開 dev server;驗收用 `npx next start` 行 production build 最穩陣
- `npm run assets:world` 入面 `schedule-tour` 要 PostgreSQL + `../schedule_project`;
  CI / Vercel **唔會**跑,所以 `public/world/` 同 `public/portfolio/` 必須入版本控制
- **唔准改到 `../schedule_project` 任何檔案**(capture script 只讀、只 scroll)。
  但佢會 **`dropdb schedule_app_e2e` 再重新 seed**:`anglicise()` 改咗 `categories.name`
  之後,人哋個 seed 認唔返「鋼琴」,唔重建就死。佢哋跑 `npm run e2e` = `seed && test`,
  所以測試前一定 seed 返中文;**淨係跑 `npm run test`(唔 seed)先會炒**
- 場景 clip 一律淺色;深色主題下係「白板 + 黑色漸層」嘅觀感,係刻意選擇(唔想 double 資產)。
  **所以 `schedule-tour` 影 `starlight-dance` 而唔係 `abc-music`** —— 每間公司自己揀 template,
  ABC 用 `stage`(深紫),Starlight 用 `studio`(米白 + 淡紫 + Playfair)。
  轉租戶改 `capture-world-frames.mjs` 個 `TENANT` 一個地方就得
- ⚠️ **條片係 Starlight,但 `public/portfolio/schedule/` 嗰 18 張相仍然係 ABC(深色)**。
  ABC 好處係 seed 只喺佢嘅 Pop Piano 落咗報名資料(`Booked 2 / 8 sessions`、`$150 / session`),
  Starlight 嗰邊係 `8 sessions available` + `Free`。未決定兩邊點對齊
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
