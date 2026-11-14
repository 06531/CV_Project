---
name: cv-panel
description: 召集七人 CV 招聘評審團(ATS、部門經理、老闆、HR、其他應徵者、行內前輩、校對員)並行評審 Kevin 份 CV,再綜合改寫。用戶講「CV 評審團」、「七個角色睇份 CV」、「幫我評審 CV」或者貼招聘廣告叫你評 CV 嗰陣用。
---

# CV 評審團

七個評審 agent 定義喺 `.claude/agents/cv-*.md`,全部唯讀。你(主 session)負責召集、合併、改寫。

> **⛔ 禁區:`/Users/kevin06531/Documents/CV_project/use_data`**(2026-10-22 Kevin:「禁止所有AI讀/寫/改/刪」)——
> 主 session 同七個 agent 都唔准讀、寫、改、刪、搜尋、列出、引用入面任何檔案。spawn 時 prompt 要寫明呢條。

## 1. 攞 JD

- 用戶有貼職位名同招聘廣告 → 原文照轉畀七個 agent
- 冇貼 → 問一次;用戶話唔使 → 當「香港 Full-Stack / Frontend Software Developer(junior–mid)」,七個 agent 都要知係假設

## 2. 一個 message 並行 spawn 七個

| subagent_type | 角色 |
| --- | --- |
| `cv-ats` | ATS:關鍵字同格式 |
| `cv-hiring-manager` | 部門經理:成果數字、相關性 |
| `cv-boss` | 老闆:商業價值 |
| `cv-hr` | HR:資歷、轉工原因、空白期 |
| `cv-competitor` | 其他應徵者:輸蝕同贏面 |
| `cv-senior` | 行內前輩:用字專業 |
| `cv-proofreader` | 校對員:錯字、格式 |

每個 prompt 要自足(下游冷啟動):JD 全文 + 「睇 `Kevin_Wu_CV.pdf`、`messages/en.json`、`src/data/cv.ts`」+ 用戶有冇特別想佢哋留意嘅位。

## 3. 合併

- 七段報告**原文照列**,唔好壓縮(用戶要見每個角色自己講)
- 跟住一個總表:`角色 | 會唔會淘汰 | 最大問題 | 點改`
- 互相矛盾嘅建議(例如 ATS 要長、經理要短)要指出,講你揀邊個同點解

## 4. 改寫(用戶要先做)

- **保持真實**:任何 agent 標「可補」嘅數字,冇用戶畀真數就唔寫入 CV,列返出嚟問
- 先講「改乜」,畀用戶揀,**唔好未問就改檔**
- 用戶要改網站:`messages/en.json` + `messages/zh-HK.json` 一齊改,技能 / tech stack 喺 `src/data/cv.ts`,
  跑 `npm run build`,再用 `npx next start -p <空 port>` 驗 `/api/cv?locale=en|zh-HK` 冇 raw key
- 交一份完整新 CV 全文(英文,跟 Canva PDF 嘅段落次序),等用戶貼返入 Canva
- Canva PDF 由用戶自己出;佢覆蓋咗 `Kevin_Wu_CV.pdf` 之後,**先讀過**再 copy 去 `public/cv/Kevin_Wu_CV.pdf`
- Word 版:`node _material/make-cv.mjs --from=<本地 /api/cv?locale=en 存落嘅 JSON>`
- commit / push 要用戶點頭(push main = Vercel production)

## 5. 收尾

最後列「改咗乜」清單,同埋仲要用戶自己做嘅嘢(Canva、補數字)。
