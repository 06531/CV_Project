# CV_project — AI 接手指南(給所有 AI 讀)

> 其他 AI(Codex / Gemini / Cursor / 新 Claude session)開工前**先讀呢份**,再讀 `CLAUDE.md`(agent team 分工 + 專案規矩)同 `PROGRESS.md`(進度)。
> 呢份係「目錄 + 規矩摘要」,細節以原檔為準,有衝突以**原檔 + code 現值**為準。最後更新:2026-11-11。
> ⚠️ 根目錄 `AGENTS.md` 只有 `next dev` 自動生成嘅 Next.js 提示區塊(**唔好手改**,會被重寫),所以接手指南放喺呢個檔。
> 負責人:**Kevin Wu**。溝通語言:**繁體中文(廣東話 OK),絕不可夾日文**。

---

## 0. 一分鐘總覽

CV_project 其實係**兩樣嘢**:
1. **CV 網站**:Kevin 嘅履歷網站 + Portfolio(case study + 自動播放嘅 scroll-world 解說動畫)。已上線 https://kevin-wu-cv.vercel.app(push `main` = Vercel production)。
2. **求職工具箱**(`_material/` + 兩個 skill):貼 JD → 自動寫求職信 / Self_Intro / Email → 多角色 agent 審核 → 合適度評分;另有七人「CV 評審團」。

技術棧:Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + next-intl(`en` / `zh-HK`)+ next-themes(深淺色)。**Next 16 有 breaking changes**(例:middleware 改名 `src/proxy.ts`),寫 code 前先讀 `node_modules/next/dist/docs/` 相關指南。

## 1. ⛔ 禁區 / 紅線(最重要)

- **`use_data/` 絕對禁區**(2026-10-22 Kevin:「禁止所有AI讀/寫/改/刪」):任何 AI 都唔准讀、寫、改、刪、搜尋、列出、引用入面任何檔案(Read / Write / Edit / Grep / Glob / Bash 一律唔得)。`.claude/settings.json` 有 deny rule。資料唔夠就**問 Kevin,唔好入去搵**。派 sub-agent 時 prompt 要寫明呢條。
- **唔准改 `../schedule_project` 任何檔案**:截圖 script 只借用佢嘅 e2e harness(會 `dropdb schedule_app_e2e` 再重建)。
- **`.env.local`、`.vercel/` 唔好讀 / 貼 / commit**。
- **求職信 / CV 唔准亂作**(Kevin 2026-10-15:「別亂作,要合乎我CV的資料」):每句事實都要喺 `messages/en.json` / `src/data/cv.ts` 搵到出處;唔識答嘅追問位就刪或者問 Kevin。評審 agent 標「可補」嘅數字,冇 Kevin 畀真數就唔寫入。
- **真實客戶 / 公司資料唔可以影上網**,只用假 data 或測試環境;未入版本控制嘅素材放 `_material/<slug>/`(已 gitignore)。
- **commit / push 要 Kevin 點頭**(push main = production deploy)。deny list:`rm -rf` 系列、`git reset --hard`、`git clean -d`、`find -delete` 等。

## 2. 目錄地圖

| 路徑 | 管咩 |
|---|---|
| `src/data/cv.ts` | CV **結構**:日期、tech stack、圖片路徑、連結(**唔放句子**) |
| `messages/en.json`、`messages/zh-HK.json` | **所有文字**(兩邊一齊改) |
| `src/app/[locale]/` | `/`(CV)、`/portfolio`、`/portfolio/[slug]`(case study);`/api/cv?locale=`、`/api/cv/download` |
| `src/proxy.ts` | next-intl locale 處理(`localeDetection: false`,一律先入英文) |
| `src/data/world.ts` + `scenes/manifest.mjs` | scroll-world 場景清單(**兩邊 scene id 要對得上**,否則 import 即 throw) |
| `scenes/<id>.html`、`scenes/scene.css` | 解說場景(純函數 `window.__setFrame(i,total)`) |
| `scripts/` | 資產 pipeline:`render-pdf-pages` / `capture-schedule` / `capture-world-frames` / `encode-world-clips` / `version-assets` / `check-all` / `case-check` 等 |
| `public/portfolio/`、`public/world/`、`public/cv/` | 生成資產(**必須入版本控制**,Vercel 不會跑 capture) |
| `_material/` | 求職素材(信、Self_Intro、Email、`applied.txt`、`ai-methods.md`、`letter.env`、`make-letter.mjs`、`make-cv.mjs`)— gitignore |
| `CV.pdf`、`Kevin_Wu_CV.pdf` | CV 原檔(Canva 出,由 Kevin 自己出 PDF) |
| `PROGRESS.md` / `README.md` / `CLAUDE.md` | 進度 / 使用說明 / agent team 規矩 |
| `.claude/agents/`、`.claude/skills/` | 見 §3、§4 |

## 3. Agent 團隊(`.claude/agents/*.md`)

**⚠️ 冇指示就唔好自動 spawn**:Kevin 講「交畀 IT team:…」或「用 dispatcher」或指名某角色先派;否則由主 session 直接做。

### 3.1 IT team
| Agent | 預設 model | 職責 |
|---|---|---|
| `dispatcher` | sonnet | 籠統要求 → 判角色 × 難度 → 明示 `model` 參數 spawn → **原文轉交**成果。**唔准自己改檔** |
| `architect` | opus | 方案、拆 task、選型,唔實作 |
| `developer` | sonnet | 實作 / 修 bug / 加 API route |
| `ui-ux` | sonnet | RWD(<768 / 768–1023 / ≥1024)、深淺色、a11y、`Reveal.tsx` 動畫要尊重 reduced-motion |
| `tester` | sonnet | `npm run build`(含 typecheck)+ Playwright(iPhone 13 + 1440×900);四項例行檢查:**橫向捲動=0、冇漏 i18n key、冇壞圖、冇 page error**;驗 `/api/cv*` |
| `qa` | sonnet | code review:正確性 → 一致性 → 可維護性 |
| `security` | opus | `src/app/api/**` 輸入驗證 / 路徑穿越、檔案讀寫、敏感資料、`src/proxy.ts` matcher |
| `devops` | sonnet | build / Vercel / npm script / 資產 script / 版本問題 |
| `docs` | haiku | 更新 `PROGRESS.md` / `README.md` / `CLAUDE.md` |

**難度 → model(dispatcher 每次明示)**:易 = haiku(rename、改文案、更新文件)、一般 = sonnet(加 component、修一般 bug、調 RWD)、難 = opus(架構、跨模組重構、tricky bug、安全、效能)。判難度睇:改幾多檔、跨唔跨層、錯咗代價。

**Agent 硬規則**:下游 agent **唔准再 spawn**(卡住報返上去);spawn prompt 要**自足**(冷啟動,冇對話 context);預設只派一個,真係要串先串。
**常見串接**:新功能 `architect`(複雜)→ `developer` → `tester`;改完 `developer` → `qa`;郁 auth / 對外 endpoint / 檔案讀寫 → `security`;收尾 → `docs`。
**Agent 定義唔會熱載入**,改完 `.claude/agents/*.md` 要重開 session。

### 3.2 CV 評審團(七個唯讀 agent,只出報告,唔准改檔、唔准作數字)
`cv-ats`(關鍵字 / 格式比對 JD)、`cv-hiring-manager`(30 秒篩 80 份,睇成果數字 / 相關性)、`cv-boss`(商業價值)、`cv-hr`(時間線、空白期、轉工)、`cv-competitor`(扮競爭對手比較輸蝕)、`cv-senior`(15 年工程師睇用字 / 技術準確)、`cv-proofreader`(錯字 / 標點 / 格式一致)。tools 只有 Read / Grep / Glob。

### 3.3 求職審核(只由 `job-apply` skill 召喚,唔好單獨用)
- `job-screener`:扮招聘公司 HR / 老闆 / 部門經理 / IT技術經理(角色由 prompt 指定),誠實決定會唔會主動聯絡 Kevin。IT技術經理要列「面試會追問」三條。
- `letter-length-reviewer`:扮好忙嘅招聘人,判斷信 / Self_Intro / Email 太長與否並畀刪減版。

## 4. Skills(`.claude/skills/`)

| Skill | 觸發 | 流程摘要 |
|---|---|---|
| `job-apply` | **Kevin 淨係貼一份 JD**(預設) | ①查 `_material/applied.txt`:舊僱主(Tradelink / CTI)或已 gen 過 → 唔 gen;**主要用 C# / ASP.NET 嘅職位 → 唔 gen**(一句話通知)②JD 提 AI → 讀 `_material/ai-methods.md`,掃三個 `.claude` 來源補新方法,揀 2–3 樣對口寫入(信入面唔寫 "PassiveIncome")③改 `_material/letter.env` + `node _material/make-letter.mjs` 出 `Cover_Letter.doc/.txt`;`Self_Intro` / `Email` 直接 copy `*_generic*.txt`(中文 JD 用 `_zh`),**通用版檔唔准改**④按 `letter.env` 開關決定審核:`REVIEW_AGENTS`(總)、`REVIEW_LETTER` / `REVIEW_EMAIL` / `REVIEW_SELF_INTRO`(行頭 `#` 或冇咗 = false,只讀唔改)⑤並行 spawn 四個 `job-screener`(附 JD 全文)⑥兩個或以上角色同一扣分位 → 改信,**三份檔都要同步改**⑦最後 `letter-length-reviewer`(作品集若係 JD 硬性要求則唔准刪)⑧交付:四角色一行摘要、長度審核、IT 面試追問、**合適度 X/10**、**⚠️ 要注意**(申請方式 / 要交乜 / 硬性門檻 / 身份語言 / 工作安排 / 陷阱)、寫 `applied.txt` 一行、講明 `.doc` + `.txt` 都 gen 咗 |
| `cv-panel` | 「CV 評審團」/ `/cv-panel` / 貼 JD 叫評 CV | JD 原文照轉 → 一個 message 並行 spawn 七個 → 七份報告**原文照列** + 總表(角色 \| 淘汰? \| 最大問題 \| 點改),矛盾建議要指出揀邊個 → **先問 Kevin 先改檔** → 網站改 `messages/*.json` 兩邊 + `cv.ts`,`npm run build`,`next start` 驗 `/api/cv` 冇 raw key → 交英文 CV 全文畀 Kevin 貼入 Canva |
| `ui-ux-pro-max` | 介面設計 | 67 風格 / 96 色板 / 57 字體 / 99 UX 指引 / 25 圖表 / 13 技術棧資料庫(`data/*.csv` + `scripts/`) |

**求職信寫作硬規矩(Kevin 親口)**
- 語言跟 JD(中文 JD → 中文信)。短、三段、淨講識嘅;第二段尾有「九月後冇停過」嗰句。
- **「九月起讀課程 + 做個人項目」要獨立一句,後面唔准接任何項目或課程內容**(課程平台九月前已開始,同九月讀嘅課程無關,面試官追問 Kevin 答唔到)。個人項目另開一句。
- `Self_Intro`:冇問候語,直接「我係 Kevin Wu,…」;**先講最合呢間公司需要嘅嘢**,通用背景(年資、技術名)排後。`Email` 正文唔好照抄信。
- JD 要作品集 / project 描述 → Email 加 Portfolio 段(課程平台、CV 網站、**AI 評審團**;JD 提 AI 一定加評審團),逐項跟 JD 指明嘅點,每項一行。
- 技術唔好淨係列名,要掛返公司 / 項目(AWS + Jenkins → Tradelink;Docker → CTI);用途細節 Kevin 未講就問,唔好估。
- Kevin 親口講過但 CV 冇寫嘅事實(可用):返工用 React 約 1 年(CMHK kiosk React Native + Startie Next.js);保險業 / financial planning 約 1.5 年(Manulife / Prudential,JD 提 Finance / Insurance 時可加一句,職銜年份未講唔好加);識普通話。
- 長度:Self_Intro ~75 字(英)/ ~150 字(中);信正文 ~200 字內、每句 ≲30 字。純前端職位可設 `letter.env` `TITLE = Web Developer`(gen 完清返)。中文信 gen 完要把 `SALUTATION` / `SIGNOFF` / `AVAILABILITY` 改返英文。
- 唔好因合適度低就唔寫,照寫並講清楚。
- 註:以上部分細則原本記喺 Claude 嘅私人 memory(`cover-letter-output-rules`、`job-fit-rating`、`kevin-languages`…),**其他 AI 睇唔到 memory** → 以 `job-apply` SKILL 原檔為準,有疑問問 Kevin。

## 5. 專案規矩(全 team 必守)

1. **加任何文字都要 `messages/en.json` + `messages/zh-HK.json` 一齊改**,漏一邊 = 切語言見 raw key。`cv.ts` 只放結構。
2. 內部連結用 `@/i18n/navigation` 嘅 `Link`,**唔好用 `next/link`**(會漏 locale)。陣列型翻譯用 `t.raw()`。
3. 顏色用語意 token(`text-ink` / `text-muted` / `bg-surface` / `border-line` / `text-accent`),唔好硬寫 hex 或 Tailwind 內建色階。
4. 改完跑 `npm run build`(含 typecheck)。
5. **`next dev` 唔熱載入 `messages/*.json`**(見 raw key 未必係 bug);驗收用 `npx next start -p 3001`。**`next dev` 同 `next start` 共用 `.next/`**,一齊行會令 production chunk 404、scroll-world 唔郁但 console 冇 error → 驗收前確認冇 `next dev`。
6. Scroll-world 加一幕:`scenes/<id>.html` + `scenes/manifest.mjs` + `src/data/world.ts` + 兩個 `messages` 嘅 `portfolio.world.scenes.<id>`,然後 `node scripts/capture-world-frames.mjs --only=<id>`、`node scripts/encode-world-clips.mjs --only=<id>`(`npm run assets:world` 全跑,支援 `--force` / `--only=id,id`)。
7. 場景 HTML 必須係 `__setFrame(i,total)` 純函數:**唔准 CSS animation / timer / `Math.random()`**,否則逐幀截圖不可重現。
8. **冇 scrub 模式**:兩個 deck(`INTRO_WORLD` / `PROJECT_WORLDS`)一律 `AutoWorld` 自動播(一個螢幕高、入到就播、Skip / Replay)。encode GOP 統一 30。
9. `kind: 'app'` 場景由 `shots[]` 剪出,食譜喺 `capture-world-frames.mjs`,登入步驟喺 `scripts/lib/schedule-app.mjs`;影 schedule 用 e2e DB `schedule_app_e2e`(會 dropdb 重建),**UI 同示範資料一律英文**,新 demo 字串加落 `scripts/lib/demo-en.mjs`(否則兩道 CJK 守尾門拒絕)。需要 **PostgreSQL 運行中**。
10. 無真畫面嘅 project(`BOARD_SHOT_WORLDS`:`smc`、`otto`)用 board 場景嘅最後一格裁成 gallery;加減一幕要跑 `node scripts/version-assets.mjs`。
11. check 驗收:`npm run check`(自動開 `next start -p 3001`,desktop + mobile 跑 index / case / assets;3001 已有 server 就借用)。單項 `npm run check:index` / `check:case` 要自己開 server。check script 要明示 `reducedMotion: 'no-preference'`,否則 `AutoWorld` 唔建 `<video>`,靜靜雞驗緊 fallback。
12. `startie` 兩個 host 已斷、source 冇存底 → `public/portfolio/startie-1..4.jpg` 係僅存記錄,**唔好刪**;`otto` 係前僱主系統,只可用畫出嚟嘅 board。

## 6. 常用指令

```bash
npm install && npm run assets      # 一次過產生 portfolio 圖(需 PostgreSQL、ffmpeg、Playwright)
npm run dev                        # http://localhost:3000(唔熱載入 messages)
npm run build && npx next start -p 3001   # 驗收用
npm run check                      # scroll-world 全套檢查
npm run assets:world -- --only=<id> --force
npm run assets:cv                  # 壓縮 CV PDF(Kevin_Wu_CV.pdf → public/cv/)
```
Word 版 CV:`node _material/make-cv.mjs --from=<本地 /api/cv?locale=en 存落嘅 JSON>`。

## 7. 當前狀態(睇 `PROGRESS.md` 為準)

- 網站已上線,四個 project 嘅 scroll-world 全部完成(schedule / otto / kiosk / startie)。
- 未決:schedule 一頁用邊間學校 —— 條片係 Starlight(淺色)但 `public/portfolio/schedule/` 18 張相仍係 ABC(深色),三選一(兩邊轉 Starlight / 條片轉返 ABC / 維持)。
- 近期 git log 主要係 CV 內容更新(Pizza Box 職位 2016–2023、Quadpaw Tech、網站內容生成 PDF)。
- 工作樹有未 commit 改動(`.claude/settings.json`、`.gitignore`、`CLAUDE.md`、`public/cv/Kevin_Wu_CV.pdf`);commit 前先 `git status` 睇清。

## 8. 通用工程規矩(Kevin 全局設定)
不可變、KISS / DRY / YAGNI;函數 <50 行、檔案 ≲800 行、早 return;新行為 + bug fix 要測試;錯誤明確處理唔吞;系統邊界驗證輸入;唔寫死秘密;commit 格式 `<type>: <description>`(feat / fix / refactor / docs / test / chore / perf / ci);PR 睇完整 `git diff <base>...HEAD` 寫 summary + test plan。
