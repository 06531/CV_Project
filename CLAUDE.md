@AGENTS.md

# CV_project — Agent IT Team

呢個 project 有一隊專屬 agent,定義喺 `.claude/agents/`。回覆一律用**繁體中文**(廣東話 OK),**絕不可夾日文**。

## 團隊名單

| Agent | 預設 model | 幾時用 |
| --- | --- | --- |
| `dispatcher` | sonnet | 要求籠統、未定邊個做 → 佢判角色 + 難度,再 spawn 落去 |
| `architect` | opus | 方案設計、拆 task、技術選型、大範圍重構規劃 |
| `developer` | sonnet | 實作功能、改 code、修 bug、加 API route |
| `ui-ux` | sonnet | RWD / 手機版、版面、配色、字體、動畫、a11y、深淺色主題 |
| `tester` | sonnet | 跑 build / Playwright、驗收、截圖對比、查漏 i18n key |
| `qa` | sonnet | code review:正確性、可維護性、專案規範一致性 |
| `security` | opus | auth / 權限、路徑穿越、注入、敏感資料外洩、相依套件風險 |
| `devops` | sonnet | build、部署(Vercel)、環境、npm script、資產產生 script |
| `docs` | haiku | 更新 `PROGRESS.md`、`README.md`、`CLAUDE.md` |

## 點觸發

- 「**交畀 IT team:<要求>**」或「**用 dispatcher 處理…**」→ spawn `dispatcher`,佢自己揀角色同 model
- 想指定角色 → 「用 `security` agent 睇下 `/api/cv/download`」
- **冇講就唔好自動 spawn** —— 照舊由主 session 直接做

## 難度 → model

`dispatcher` 每次 spawn 都會明示 `model` 參數蓋過角色預設,做到「同一個角色,按難度換腦」:

| 難度 | model | 例子 |
| --- | --- | --- |
| 易 | `haiku` | rename、格式化、改文案、更新文件、睇檔 |
| 一般 | `sonnet` | 加一個 component、修一般 bug、寫測試、調 RWD |
| 難 | `opus` | 架構設計、跨模組重構、tricky bug、安全分析、效能問題 |

## 硬規則

- `dispatcher` **唔准自己改檔**,只准 Read / 搜尋 / spawn
- `dispatcher` 要**原文轉交**下游成果,唔准壓縮或改寫技術細節
- 下游 agent **唔准再 spawn 其他 agent**(避免無限層),有需要就報返上去
- spawn 嘅 prompt 要自足 —— 下游係冷啟動,冇對話 context
- 預設只派一個 agent;真係要串接先串(例如 `developer` → `tester`)

## 常見串接

- 新功能:`architect`(如複雜)→ `developer` → `tester`
- 改完想安心:`developer` → `qa`
- 郁到 auth / 對外 endpoint / 檔案讀寫:任何角色 → `security`
- 收尾:→ `docs` 更新 `PROGRESS.md`

## 全 team 都要知嘅專案規矩

- **加任何文字都要 `messages/en.json` 同 `messages/zh-HK.json` 一齊改**,漏一邊 = 切語言見 raw key
- `src/data/cv.ts` 只放結構(日期、tech stack、圖片路徑、連結),句子一律入 `messages/`
- 內部連結用 `@/i18n/navigation` 嘅 `Link`,唔好用 `next/link`(會漏 locale)
- 顏色用語意 token(`text-ink` / `text-muted` / `bg-surface` / `border-line` / `text-accent`),唔好硬寫 hex 或 Tailwind 內建色階
- 陣列型翻譯用 `t.raw()`,唔係 `t()`
- 改完跑 `npm run build`(已包含 typecheck)
- **`next dev` 唔會熱載入 `messages/*.json`** —— 見到 raw key 唔一定係 bug,
  驗收文案要用 `npx next start -p 3001` 行 production build
- **唔准改到 `../schedule_project` 任何檔案** —— 截圖 script 只借用佢現成嘅 e2e harness
- Scroll-world 加一幕:`scenes/<id>.html` + `scenes/manifest.mjs` + `src/data/world.ts` +
  **兩個** `messages/*.json` 嘅 `portfolio.world.scenes.<id>`,之後
  `node scripts/capture-world-frames.mjs --only=<id>` 再 `node scripts/encode-world-clips.mjs --only=<id>`
- 場景 HTML 一定要係 `window.__setFrame(i, total)` 嘅純函數 —— 唔准用 CSS animation /
  timer / `Math.random()`,否則逐幀截圖唔可重現
- 改完 scroll-world 一定要跑 `npm run check:world`(桌面 + `mobile` 各一次)
- 未入版本控制嘅專案素材放 `_material/<slug>/`(已 gitignore);
  **真實客戶 / 公司資料唔可以影上網**,只用假 data 或測試環境
- `AGENTS.md` 由 `next dev` 自動重寫,唔好手改

## 其他設定

- `.claude/settings.json`:危險指令 deny list + `Write`/`Edit` 之後把檔案路徑寫入 `.claude/change-log.txt`
- 日後可以再加嘅角色:`data`(DB / migration)、`debugger`(專責查難搞 bug)、`product`(需求變驗收標準)、`perf`(bundle size / Core Web Vitals)
