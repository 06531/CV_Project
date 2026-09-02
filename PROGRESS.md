# CV 網站 — 進度

**最後更新:** 2026-09-03(已上線 https://kevin-wu-cv.vercel.app;所有 scroll-world 一律自動播;
OTTO 同 SMC 兩個 project 完全唔用真畫面)
**技術棧:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + next-intl + next-themes

## 目標
把 `CV.pdf` 做成一個網站,等 HR / 面試官喺 desktop 同手機都睇得舒服;
另外用真實系統嘅截圖同「解說式」scroll 動畫做 Portfolio。

## 已完成 ✅

### 基本網站
- Next.js 16 專案 scaffold(`src/` + App Router + Tailwind v4),`CV.pdf` 原檔保留
- `scripts/render-pdf-pages.mjs`:用 macOS PDFKit(JXA)render CV.pdf p.5–9 → `public/portfolio/*.jpg`
  (p.3–4 係 OTTO 兩版,成版都係真系統截圖,而家唔再 render —— 見下面「OTTO 換走真畫面」)
- `scripts/capture-schedule.mjs`:借用 `../schedule_project` 現成 e2e harness 影 desktop + mobile 各 9 張
- 內容分層:`src/data/cv.ts` 只放結構,文字全部喺 `messages/en.json` 同 `messages/zh-HK.json`
- i18n(`en` / `zh-HK`,`src/proxy.ts` + next-intl)、深淺色主題、RWD、`@media print`
- Backend:`GET /api/cv?locale=`、`GET /api/cv/download`

### Scroll-world(今次大改)
- **淨返一個播放引擎:全部自動播** —— `/portfolio` 個開場以前要用 scroll 拖(`ScrollWorld`,
  4vh track + sticky stage + 一 session 播一次嘅 `seenKey` 掣),而家同 case study 一樣
  用 `AutoWorld`:一個螢幕高、入到就播、右上角 Skip、播完 Replay。
  順手刪走 `ScrollWorld.tsx`、`world-check.mjs`、`scroll` / `linger` / `WORLD_CROSSFADE` /
  `WORLD_OUTRO_VH` / `worldHeightVh` / `lingerEase`,`WorldStage` 淨返個空 deck 守門。
  encode 唔再分 GOP(統一 30),兩條 intro clip 重 encode 之後細咗一半
  (`agents-m.mp4` 429KB → 204KB)。check 由 `check:world` 改做 `check:index`,同 case 共用
  `case-check.mjs`
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
> ⚠️ 呢節係歷史記錄。`otto-tour` 同成個 `kind: 'remote'` 已經喺 2026-09-03 拆走,
> 睇返下面「OTTO 換走真畫面」。
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

### OTTO 換走真畫面(2026-09-03)
- **`otto-tour` 收檔,改咗做 `otto-desk` 解說段** —— 理由同 SMC 一樣:
  個平台係前僱主嘅,唯一影到嘅環境入面係真客戶資料,無論個環境叫唔叫 UAT。
  新一幕畫嘅係「文件檯」:一個資料夾裝住成票貨 → 逐行文件出齊 →
  一個 filter 落喺 Mode 欄(7 行剩 4 行)→ 海/空/鐵/速遞 25 種文件類型點數上去。
  入面每個資料夾編號、公司名、文件編號全部虛構
- **`kind: 'remote'` 整支拆咗** —— manifest 嘅 `REMOTES`(含 UAT URL、真客戶名嘅
  anonymise / forbidden 清單)同 `capture-world-frames.mjs` 入面約 250 行
  CDP + 匿名化 + 守尾門一齊刪。OTTO 係佢唯一用家,冇咗就唔再留住嗰啲名喺 repo
- **Gallery 都唔再用真畫面**:`otto-1/2.jpg` 本來係 CV p.3–4(成版真系統截圖),
  而家同 SMC 一樣用三幅 board。`render-pdf-pages.mjs` 唔再 render 嗰兩版
- **board 圖改成 encode 階段自動出**:`BOARD_SHOT_WORLDS`(`src/data/world.ts`)
  列邊個 project 用 board 做 gallery,`encode-world-clips.mjs` 就由每一幕最後一格
  裁 1600×626(2.56:1,啱 `aspect-[2.56/1]` 個格)寫落 `public/portfolio/<slug>-N.jpg`,
  而 `cv.ts` 嘅 `boardGallery()` 由同一個 deck 砌 images —— 兩邊唔會走位。
  個裁切框係六幅 board 嘅聯集加位,新 board 闊過佢就要調(唔調就靜靜雞裁到邊)
- 記得跑 `node scripts/version-assets.mjs`:portfolio 圖變咗就要換 `?v=` token

### CMHK Kiosk 三幕(2026-08-06)
- 素材:source code `/Users/kevin06531/Documents/kiosk/cmhk-kiosk`(Expo / RN 0.71,60 檔)
- **三幕全部係解說段,冇 tour** —— 影唔到真 UI,三個獨立原因:
  1. API 硬寫死內網 IP(`screens/main.tsx` + `screens/checkStatus.tsx` 都係
     `10.0.17.213:4200` WMS / `:3010` socket),外網連唔到
  2. `react-native-pdf`(`components/selectPDF.tsx`)同 `react-native-sound`
     (`screens/auth/socketCheckIn.tsx`)係 native-only,expo web bundle 一入就爆
  3. 半數畫面根本要 socket push 先出現(`request_checkin` / `check_in_approval` /
     `scan_item` / `pdf.url`),冇後端就係一版白畫面
  → 要影就要 Android 模擬器 + prebuild + 自己寫假 WMS,唔值,所以照 `agents.html` 嗰套砌
- `kiosk-flow` —— 司機側,一部 kiosk 機身逐格換畫面:揀單種 → 掃 QR(附查重)→
  電話 keypad → 等批核 → APPROVE / REJECT。旁邊一條 rail 標住每步打邊個 endpoint
- `kiosk-desk` —— 倉務員側:socket 推播 + 響鬧 → 時段不符要人拍板 → **鎖住另一部機**
  (`checkServiceOn`,防止兩個人接同一張單)→ 掃夠數變綠 → PDF + QR
- `kiosk-fleet` —— 4 部機 20 秒心跳:綠 → 一輪冇聲氣 → 兩輪 → 紅「connection fail」,
  仲有 `pingGuest.do` 補救掣
- 機身入面用返 app 自己嘅色(`#8CC644` 綠 / `#4C4C4C` 灰 / `#242424` 狀態框),
  當佢係被拍攝物件;外框、chip、log 一律用 `scene.css` 嘅共用 token
- **畫面全英文**;寫得 CMHK 個名(CV 文案本身已經有),但唔用佢 logo,
  單號 / SKU / 公司名全部係假嘅(`RL2311000001`、`Kowloon Freight`)
- 直度嗰句 `$` caption 要短過橫度 —— 站點嘅「3 / 3」同「Skip」兩粒掣就喺手機幀右上角,
  長 caption 會捐入去佢哋底下(`command()` 讀 `max-aspect-ratio: 3/4` 揀短版)
- `src/data/world.ts` 加 `kiosk` key(1.8 / 1.8 / 1.5 vh);clip 合共 4.0MB

### Startie 三幕(2026-08-06)
- **素材:得返 CV 嗰四版**。三條路全部斷:
  - `ems.s7yr0.com` / `api.s7yr0.com` 都 curl 唔到(`000`,連唔上,唔係 404)
  - `~/Documents/event_project` 只得一個 `README.md`(git tree 就係得呢一個檔)
  - GitHub remote `06531/event_management_project` —— `git ls-remote` 零個 ref = 空 repo
- 但 `public/portfolio/startie-1..4.jpg` 入面料好足,三幕全部由嗰度讀返嚟:
  - `startie-setup` —— 左邊十個設定區逐個剔綠(時程 / 報名 / 表單 / 內容 / 獎項 /
    主題 / 選單 / FAQ / 主辦單位 / 佈告),右邊跟住換畫面:時區選擇 → 獎金自動加總 →
    三個佈景主題 → 送審。送審之後 `In review` 轉橙 + 「locked while under review」
  - `startie-money` —— 兩條收費線分開講:VIP1–4 置頂($200 / $400 / $700 / $900,3–10 日,
    價錢係 super admin 設定)→ Stripe Checkout → 列表重排、中咗嗰個彈上第一;
    另一條係課金解鎖報名欄位,FREE badge 換 PRO
  - `startie-stack` —— 架構圖:Next.js(Recoil / immer / CKEditor 5 / i18next / MUI)↔
    NestJS(MVC / JWT / MikroORM)↔ PostgreSQL,Stripe 同 S3 掛喺旁邊,
    一粒 token 行過條脊骨再拐去 Stripe,最後三種身分逐個亮
- **順手補返 `src/data/cv.ts` 個 tech list** —— 之前得 `RESTful API` 頂住,
  但 CV 自己幅架構圖寫住 NestJS / MikroORM / PostgreSQL / JWT / S3 / 兩個 Vercel 部署
- 排版:`startie-stack` 直度唔准 side node 換行,否則變五格直疊、超出 scrim 90px,
  而且 Stripe 會夾喺 NestJS 同 PostgreSQL 中間,睇落好似 request 穿過佢

### 播放模式對調 + clip 壓細(2026-08-06)
- **`/portfolio` 由自動播轉 scroll 拖動,project 內頁反過來轉自動播**
  —— `WorldStage` 個 `mode` prop 喺兩個 call site 對調就得,section 由組件自己出,
  頁面唔使改結構。理由寫咗入 `WorldStage.tsx`:落到 project 頁嘅人係specifically
  想睇嗰個 project,唔應該先拖三個螢幕;而首頁本身就係一個要碌嘅清單
- `ScrollWorld` 個 Skip 係跳過自己嗰個 section(`offsetTop + offsetHeight`),
  唔靠 anchor,所以兩邊掉轉都唔使動 `skipTo`;`AutoWorld` 就要(內頁改咗 `#case`)
- **`public/world/` 25.7MB → 18.1MB(-30%)**,全部重編,keyframe 節奏不變:
  - `encode-world-clips.mjs` 嘅 profile crf:桌面 20 → **26**,手機 23 → **28**
  - 真 UI 兩幕另計(`scenes/manifest.mjs` 嘅 per-scene `crf`,兩個 viewport 共用):
    `schedule-tour` 由預設 → **27**,`otto-tour` 27 → **31**
  - 驗過質素先落決定:抽第 120 幀、裁最細嗰行 mono chip、放大兩倍對比 ——
    解說段 crf 28 同 crf 20 睇唔出分別;`otto-tour` crf 31 個 jqGrid 文字仍然清楚,
    淨係格線軟咗少少(而且成幅嘢係喺 scrim 後面)
  - **解說段咁慳係因為佢哋近乎向量圖**;真 UI 截圖同一個 crf 貴幾倍,
    所以唔可以一個數字行天下

### 部署(2026-08-06)
- **上線咗:https://kevin-wu-cv.vercel.app**(Vercel project `06531s-projects/cv-project`)
- **`NEXT_PUBLIC_SITE_URL` 結果唔使設** —— Vercel 自己派咗 `kevin-wu-cv.vercel.app`
  做 production domain,`src/site.ts` 個 `VERCEL_PROJECT_PRODUCTION_URL` fallback
  已經出到正確 URL(實測 sitemap / robots 兩邊都係佢)。**日後上自訂網域先要設**,
  設咗就要記住跟住域名改,否則反而會 stale
- `.vercelignore`:第一次 `vercel --prod` 死喺 "Upload aborted",因為 CLI 上緊
  `.frames`(430MB)同 `_material`(578MB)。兩個雖然都喺 `.gitignore`,但明示咗最穩陣;
  順便擋埋 `CV.pdf` 母版(網站只用 `public/cv/` 嗰份壓細版)
- 實測 live:兩個 locale × 六條路徑全部 200、`/api/cv/download` 有 `attachment`、
  clip 同 PDF 都 serve 到正確 size、project 頁自動播冇 page error

### CV PDF 壓細(2026-08-06)
- `public/cv/Kevin_Wu_CV.pdf` **4.28MB → 1.67MB(-61%)**,`scripts/compress-cv-pdf.mjs`
  + `npm run assets:cv`
- **母版 `CV.pdf` 唔郁** —— 佢同時係 `render-pdf-pages.mjs` 出相簿嗰七版嘅來源
- 點解慳得咁多:91% 檔案係圖,而 180 張入面 **172 張係 FlateDecode(無損)** ——
  設計軟件貼上去嘅截圖。轉 JPEG 200dpi / q85 就係嗰 61%
- **文字層完全冇變**:抽出嚟嘅 text byte-identical(27,081 字元),因為版面文字係向量,
  唔會經過圖片處理路徑
- **macOS 內置 Quartz「Reduce File Size」做唔到呢件事** —— 經 PDFKit 套落去佢淨係
  重寫個檔、唔會重新編碼,出嚟 4.48MB,仲大過原檔。所以要 ghostscript(script 會自己檢查)

### Keyframe 密度跟播放模式(2026-08-06)
- **`public/world/` 18.1 → 10.9MB,質素零損失** —— 同一個 crf、同一解像度,淨係改 GOP
- 點解得:內頁而家自動播,`AutoWorld` 用真 `video.play()`,**由頭到尾冇 seek**。
  短 GOP(桌面每 8 格一個 keyframe)存在嘅唯一理由係「拖動要即時 seek」,
  自動播嗰陣嗰啲多出嚟嘅 keyframe 就係純浪費
- `scenes/manifest.mjs` 每幕加 `playback: 'scrub' | 'auto'`,encode script 照住揀 GOP
  (scrub 8/4,auto 30/30)。而家 12 幕 auto、2 幕 scrub(`/portfolio` 個開場)
- ⚠️ **`playback` 一定要同頁面對得上** —— 改 `WorldStage` 個 mode 就要一齊改呢度再重 encode,
  否則 auto clip 畀人用手拖會喺手機度窒
- `otto-tour` 4.27 → 1.76MB(佢一個就佔咗成個 saving 三分一)
- 試過但唔用嘅路:
  - **縮解像度**(1728 → 1440 寬)慳得多,但 jqGrid 右邊嗰欄文字明顯化開 —— 細字唔食得縮
  - **`-preset veryslow`** 檔案細啲,但同一個 crf 反而糊過 `slow`;
    佢啲心理視覺取捨(多 B-frame、adaptive quant)對高對比細字唔友好
  - **手機版加 crf** —— 720 寬本身冇餘裕,31 → 35 明顯散

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

- [x] ~~四個 project 嘅 scroll-world~~ —— 全部做齊(schedule / otto / kiosk / startie)
- [ ] **決定 schedule 一頁用邊間學校**:條片係 Starlight(淺色),相簿 18 張仍然係 ABC(深色)。
      三選一 —— 兩邊都轉 Starlight(要重影 18 張,但會失去 ABC 嗰啲報名資料)/
      條片轉返 ABC(舊 mp4 已經冇備份,要重拍)/ 維持而家咁,當「唔同學校唔同樣」嚟賣
- [x] ~~部署(Vercel)~~ —— https://kevin-wu-cv.vercel.app,`NEXT_PUBLIC_SITE_URL` 唔使設(見上)
- [x] ~~資產壓細~~ —— `public/world/` 25.7 → **10.9MB**,`Kevin_Wu_CV.pdf` 4.28 → 1.67MB

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
- `startie` 兩個 host(`ems.s7yr0.com` / `api.s7yr0.com`)已經完全連唔到,source code 亦冇存底 ——
  `public/portfolio/startie-1..4.jpg` 嗰四版 CV 係僅存嘅記錄,唔好刪
- `otto` 冇得影都冇得連 —— 系統係前僱主嘅,而家三幕全部係畫出嚟嘅 board
- ⚠️ **`next dev` 同 `next start` 共用 `.next/`** —— 兩個一齊行,dev 會覆蓋 production
  嘅 static chunks,`next start` 嗰邊個頁面就會 JS 404、component 唔 hydrate,
  scroll-world 完全唔郁但 **console 冇 error**。驗收之前先確認冇 `next dev` 行緊
- check script 要明示 `reducedMotion: 'no-preference'`(喺 `scripts/lib/browser.mjs`)——
  新版 headless Chromium 預設報 `prefers-reduced-motion: reduce`,而 `AutoWorld` 見到就
  索性唔建 `<video>`,結果個 check 靜靜雞去驗緊 stills fallback
- Agent 定義唔會熱載入:改完 `.claude/agents/*.md` 要重開 session

## 驗證方法
```bash
npm run build                 # typecheck + build,現時 21 條 route
npx next start -p 3001        # 驗收一定要用呢個(見上面 messages 熱載入問題)
npm run check                 # index + case + assets,desktop 同 mobile 各一次
```
`npm run check` 拆開係三支,全部 fail 就 exit 1:

| 指令 | 睇乜 |
| --- | --- |
| `check:index` | `/en/portfolio` 個開場 deck,同下面一樣係自動播,用同一支 script |
| `check:case` | `/en/portfolio/schedule` 嘅自動播:每次入都播(唔會開喺死掣上)、開場捲走再捲返唔會蓋住粒 Play、播完出 Replay 而且撳完真係全部歸零 |
| `check:assets` | 18 張 schedule stills + 兩條 tour clip 各 8 格都要夠光 —— 即係擋住 capture 漏咗 `setTheme`、stills 同片走返兩間學校 |

兩個 deck 而家同一個機制,所以 `case-check.mjs` 一支就夠,指邊條 URL 都得
(`npm run check:index` / `check:case` 只係幫你填好 URL)。

其他:
- `curl -s localhost:3001/robots.txt` / `sitemap.xml` / `-I /en/opengraph-image`(要 `image/png`)
- `curl -I localhost:3001/api/cv/download` → `content-disposition: attachment`
- 兩個 locale 都唔見 raw key;手機無橫向捲動;`prefers-reduced-motion` 只見 poster
