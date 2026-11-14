---
name: job-apply
description: Kevin 貼一份招聘廣告(JD / 職位名 + 公司 + Job Description)就用 —— 先查有冇申請過,再寫求職信 + Self_Intro.txt + Email.txt,跟住並行 spawn 四個 job-screener 扮呢間公司嘅 HR / 老闆 / 部門經理 / IT技術經理審核會唔會聯絡佢,最後報合適度、評價同要留意嘅地方。淨係貼 JD 冇講其他嘢,預設就係行呢個;明確講「CV 評審團」先用 cv-panel。
---

# 貼 JD → 求職信 + 公司審核 + 合適度

寫法細節全部跟 memory 嘅 `cover-letter-output-rules`、`job-fit-rating`、`kevin-languages`、
`kevin-since-sept-2026`,呢度只講流程。

> **⛔ 禁區:`/Users/kevin06531/Documents/CV_project/use_data`**(2026-10-22 Kevin:「禁止所有AI讀/寫/改/刪」)——
> 主 session 同所有 spawn 出去嘅 agent 都唔准讀、寫、改、刪、搜尋、列出、引用入面任何檔案
> (Read / Write / Edit / Grep / Glob / Bash 一律唔得)。
> spawn agent 時 prompt 要寫明呢條。資料唔夠就問 Kevin,唔好入去搵。

## 1. 查有冇申請過

讀 `_material/applied.txt`。公司係舊僱主(Tradelink / CTI,留意獵頭 JD 背後可能係佢哋)或者已經 gen 過
→ **唔 gen**,話 Kevin 知(幾時、咩職位、當時合適度),停喺度。

**主要用 C# / ASP.NET(.NET)嘅職位 → 唔 gen**(2026-11-04 Kevin:「如果主要是用C#, ASP.NET的公司不用gen」)——
JD 嘅核心技術係 C# / ASP.NET / .NET 就停喺度，一句話 Kevin 知(公司 + 職位 + 「主要用 C#/.NET,跳過」),
唔寫信、唔 spawn agent、唔加入 applied.txt。C# 只係 nice-to-have 或者其中一個選項就照做。

## 1b. AI coding 經驗 → 每封都要提(收集 AI 方法)

**Email / Cover Letter / Self_Intro 三樣每次都要提 Kevin 有 AI coding 經驗**(skill / agent / loop / schedule 等運用),
唔使等 JD 提 AI(2026-11-13 Kevin:「寫email / cover letter / self_intro 都要提及我有使用AI coding經驗例如skill/agent/loop/schedule等等運用」)。
JD 冇提 AI → 每樣一句帶過就夠,揀 1–2 樣最對口;JD 有提 AI / LLM / prompt / agent / Copilot / Chatbot / AI 自動化 / AI 工具 → 照下面詳細做、揀 2–3 樣。
通用版 `Self_Intro_generic*` / `Email_generic*` 已加咗呢句(2026-11-13 Kevin 同意改通用版),copy 後唔使再補;封信正文同樣要有。

- 讀 `_material/ai-methods.md`(Kevin 嘅 AI 方法庫,有實物佐證)
- 掃一次三個來源有冇新嘢:`/Users/kevin06531/Documents/schedule_project/.claude`、
  `/Users/kevin06531/PassiveIncome/.claude`、本 repo `.claude`(agents / skills / settings 嘅 hooks)。
  有新 agent / skill / 做法就補入 `ai-methods.md`,改「上次更新」日期。**只讀,唔准改嗰兩個 repo**
- 揀 2–3 樣同 JD 職責最對口嘅寫入信、Self_Intro 同 Email(例:LLM 測評 → 評審團 / 多角色審核;
  AI 自動化 → headless run;agent 開發 → dispatcher 派工 + 互檢鏈)
- 信入面唔好寫 "PassiveIncome" / 被動收入,講 personal project;漏洞故事唔入信
- 交付時列埋「今次用咗邊幾樣 AI 方法」

## 2. 寫三樣嘢(全部覆寫 `_material/` 頂層)

- 語言跟 JD:中文 JD → 中文信;英文 JD → 英文信
- 改 `_material/letter.env`:`COMPANY` / `CITY` / `ROLE` + 針對呢份 JD 改正文(短、三段、淨講識嘅、
  第二段尾有「九月後冇停過」嗰句),跟住 `node _material/make-letter.mjs`
  → `Cover_Letter.doc` + `Cover_Letter.txt`
- **`Self_Intro.txt` 同 `Email.txt` 唔使自己度**(2026-10-28 Kevin:「每次都用這通用email and self_intro
  找agent 審核再作修改,不用每次都先gen再審」):直接 copy 通用版落去,英文 JD 用
  `Self_Intro_generic.txt` / `Email_generic.txt`,中文 JD 用 `*_generic_zh.txt`;Email 入面 `{ROLE}` 換做職位名,
  其他字一個都唔好預先改,原封不動交畀第 3 步四個角色審核,再跟第 4 步嘅共識修改,
  **長度審核(4b)一樣排最後**(Kevin:「審核長度agent最後先睇」)。通用版檔本身唔准改(要改先問 Kevin)
  - `Self_Intro`:冇問候語,直接「我係 Kevin Wu,…」/「I'm Kevin Wu, …」
  - `Self_Intro` **先講最合呢間公司需要嘅嘢**(2026-11-06 Kevin:「記錄 Self_Intro 先講我對這公司合適的需要先」)——
    按 JD 要求揀 Kevin 已確認、最對口嗰幾樣放最前(例:JD 要 sales → 先講 3 年 sales;要客戶服務 → 先講 Pizza Box / Manulife),
    通用背景(年資、技術名)排後。只用已確認事實,唔好為咗對口而作
  - `Email`:正文**唔好照抄封信**(封信已經係附件)
- **JD 要作品集 / portfolio / project 描述** → Email 加「Portfolio」段,JD 指明要講邊幾點就逐項跟
  (例如 Problem / Built / AI tools / I implemented / Tested),每項一行。現成三項喺
  `_material/ai-methods.md` 嘅「作品集範本」:課程平台、CV 網站、**AI 評審團**(JD 有提 AI 就一定加埋評審團)。
  作品集係 JD 硬性要求,長度審核唔准刪
- **技術唔好淨係列名**(審核角色會嫌「唔知用嚟做乜」):掛返落公司 / 項目寫。已知:
  AWS + Jenkins → Tradelink;Docker → CTI(Continuous Technologies);用途細節 Kevin 未講,唔好作
  (memory `kevin-devops-where`)。其他技術一樣,搵唔到喺邊用就問 Kevin,唔好估
- **CV 冇寫、但 Kevin 親口講過嘅事實**(寫信時要用,唔好當 gap):
  - 返工用 React 約 1 年:CMHK kiosk(React Native,Tradelink)+ Startie(Next.js 客戶項目)(memory `kevin-react-work`)
  - **保險業背景約 1 年半:Manulife / Prudential,做 financial planning**:JD 提 Finance / Insurance → 信加一句
    "I also spent a year and a half in financial planning at Manulife and Prudential."(職銜 / 年份未講,唔好加)
    (memory `kevin-insurance-background`)
  - 識普通話(memory `kevin-languages`)
- **唔准亂作,一切要合乎 CV**(2026-10-15 Kevin:「別亂作,要合乎我CV的資料」):
  - 每句事實都要喺 CV(`messages/en.json` / `src/data/cv.ts`)或者 memory 搵到出處;兩樣事實唔好自己駁埋變成第三樣
  - **「九月起讀課程 + 做個人項目」嗰句要獨立一句,後面唔准接任何項目或課程內容**
    (唔好寫 "Since September… including <課程平台>" /「九月起…其中一個是…」)——
    課程平台九月前已經開始做,同九月讀嘅課程無關;面試官問「九月讀咩?同個平台有乜關係?」Kevin 答唔到
  - 要講個人項目就另開一句(「個人項目方面…」/ "My personal projects include …")
  - 寫完自己問:「面試官追問呢句,Kevin 答唔答得出?」答唔出就刪或者問 Kevin
- 長度目標:Self_Intro ~75 字(英)/ ~150 字(中);封信正文 ~200 字以內、每句唔好超過 ~30 字
- 中文信 gen 完要把 `letter.env` 嘅 `SALUTATION` / `SIGNOFF` / `AVAILABILITY` 改返英文
- 信頭名下面嗰行職銜由 `letter.env` 嘅 `TITLE` 控制(留空 = Software Developer)。純前端 / 網頁職位
  (審核嫌 "Software Developer" 似後端)→ 設 `TITLE = Web Developer`,gen 完清返做空,免得帶落下一封信

## 3. 公司審核(一個 message 並行 spawn 四個)

> **開關:`_material/letter.env` 三個 boolean**(2026-11-02 Kevin:「比個位我入boolean,for true 就agent 睇 cover letter / email/self_intro」→「三份各一boolean」)
> - **總開關 `REVIEW_AGENTS`**(2026-11-06 Kevin:「加多個boolean true就用agent審核。false就只需gen我要的文件」):
>   `true` = 用 agent 審核,再睇下面三個逐檔開關;`false` = **唔 spawn 任何 agent**(跳過第 3、4、4b 步,包括長度審核),
>   淨係寫信 + copy 通用 Self_Intro / Email 然後交,三個逐檔開關唔使睇。行頭加 `#` 或者成行冇咗 = `false`(同三個逐檔開關一樣,Kevin 2026-11-06 喺 letter.env 將佢註釋咗)
> - `REVIEW_LETTER` → Cover_Letter;`REVIEW_EMAIL` → Email.txt;`REVIEW_SELF_INTRO` → Self_Intro.txt
> - `true`(預設)嘅檔:照做第 3、4、4b 步 —— 四個角色審核、跟共識修改、長度審核
> - **行頭加 `#`(註釋咗)或者成行冇咗 = `false`**(Kevin:「#REVIEW_EMAIL = true … 就只睇cover letter」)
> - `false` 嘅檔:**唔交畀任何 agent 睇、唔跟審核改、唔做長度審核**,寫完(或 copy 通用版)就原樣交
> - spawn 嘅 prompt 只列 `true` 嘅檔;第 4 步「三樣都改」只改 `true` 嘅檔
> - 三個都 `false`(或總開關 `REVIEW_AGENTS = false`)→ 跳過第 3、4、4b 步,唔 spawn 任何 agent;交付寫明「今次冇 agent 審核」,合適度由主 session 自己評
> - 只讀呢啲值,唔好自己改

`subagent_type: job-screener`,四個 prompt 分別指定角色 `HR`、`老闆`、`部門經理`、`IT技術經理`,
每個都要附 **JD 全文**(下游冷啟動)。

## 4. 根據審核修正

四個入面有兩個或以上講同一個扣分位,而且改法唔違反 memory 規矩(唔寫唔識嘅、唔寫人工、唔認缺口)
→ 直接改返 letter.env,再跑一次 make-letter。改咗乜要講。
其他建議列出嚟畀 Kevin 揀,唔好自己改。

**封信改完,一定要同步改埋 `Self_Intro.txt` 同 `Email.txt`**(同一批扣分位都要處理,例如
審核話開頭講年資扣分、要加某個證據),三個檔都改好先可以去 4b。唔好淨改封信就送長度審核。

## 4b. 最後一關:長度審核(一定要做)

四個角色審核完 → 封信 + Self_Intro + Email **三樣都改完** → 先 spawn 一個 `letter-length-reviewer`(prompt 附 JD 全文 + 講明 JD 硬性要求邊啲內容,例如作品集)。
佢判「偏長 / 太長」嘅檔 → 用佢嘅刪減版覆寫(先核實冇加新事實、冇刪「九月後」嗰句、冇刪 JD 硬性要求嘅內容),
letter.env 有改就再跑一次 make-letter。全部「啱啱好」就唔使改。

## 5. 交付(要短)

1. 四個角色審核:每個一行 —— `角色 | 會唔會聯絡 | 吸引分 | 最扣分一點`
1a. 長度審核:每個檔一行 —— `檔案 | 字數 | 判斷`,同埋刪咗乜
1b. IT技術經理列嘅「面試會追問」三條,照列畀 Kevin 準備
2. 跟審核改咗乜(冇就寫「冇改」)
3. **合適度 X/10** + match + gap + 值唔值得申請(格式跟 `job-fit-rating`)
3b. **⚠️ 要注意(必出,唔可以漏)** —— 逐份 JD 掃晒以下各項,有就列,全部冇就寫「冇特別要求」:
   - 申請方式:一定要 email / 求職網站 / 指定表格?有冇截止日期?
   - 要交乜:期望薪酬、現職人工、可到職日期、notice period、作品集 / GitHub / 社交媒體、成績表、證書
   - 硬性門檻:學歷(學士?)、年資、指定行業經驗、指定技術
   - 身份語言:HK Residents Only / 工作簽證、普通話、寫中文
   - 工作安排:地點(遠唔遠)、Hybrid / 返幾日、輪班、OT、出差
   - 陷阱:獵頭背後可能係舊僱主、職位寫「唔需要工程師背景」等暗示人工 / 定位唔同、Senior / Junior 混埋招
   - 面試可能會問嘅尷尬位(例如點解由 developer 轉做呢類工)
4. 喺 `applied.txt` 加一行:`日期 | 公司 | 職位 | 合適度`
5. 一句講三個檔喺 `_material/` 準備好,**明確講 `Cover_Letter.doc` + `Cover_Letter.txt` 都 gen 咗**(2026-11-02 Kevin:「記住幫我gen cover letter.txt」)

唔好因為合適度低就唔寫 —— 照寫,講清楚就得。
