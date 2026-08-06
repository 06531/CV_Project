// English demo data for the course-scheduling platform's capture database.
//
// `server/src/seed.ts` over in schedule_project writes its demo companies,
// courses and people in Chinese. The portfolio films that app in English, and
// switching the UI locale only translates the chrome — the seeded rows would
// still read 兒童鋼琴入門 in an otherwise-English calendar.
//
// So the swap happens at the source: `anglicise()` in ./schedule-app.mjs runs
// this table over the freshly seeded `schedule_app_e2e` before the browser ever
// opens. Nothing is retouched afterwards, and no file in schedule_project is
// modified — only rows in that throwaway E2E database.
//
// Keyed by the exact seeded string. `courses.category` is a denormalised copy
// of `categories.name`, so one entry covers both.

/** @type {Record<string, string>} */
export const DEMO_EN = {
  // --- companies ---------------------------------------------------------
  'ABC 音樂教室': 'ABC Music Academy',
  'XYZ 補習社': 'XYZ Tutorial Centre',
  '星光舞蹈學院': 'Starlight Dance Academy',
  'STREET BEAT 街舞工作室': 'STREET BEAT Dance Studio',

  '專注鋼琴、結他與樂理的小班教學。': 'Small-group teaching in piano, guitar and music theory.',
  '中小學數理科補習,小班互動教學。':
    'Interactive small-group maths and science tutoring, primary to secondary.',
  '芭蕾、爵士與街舞,兒童至成人小班教學。':
    'Ballet, jazz and street dance — small classes for children through adults.',
  'Hip Hop、Breaking、Popping,由零開始到 battle。':
    'Hip hop, breaking and popping, from first steps to battle-ready.',

  '灣仔道 100 號 3 樓': '3/F, 100 Wan Chai Road',
  '彌敦道 500 號 8 樓': '8/F, 500 Nathan Road',

  // --- taglines (companies.theme / teachers.theme, JSON) -----------------
  '用音樂陪伴每位孩子成長': 'Growing up with music',
  '打好數理基礎,考試更有信心': 'Strong fundamentals, confident exams',
  '用身體說故事': 'Telling stories with the body',
  '用節奏說話': 'Speaking in rhythm',
  '鋼琴 · 從零到舞台': 'Piano — from first note to stage',
  '每一步都算數': 'Every step counts',
  '一對一・自組小班': 'One-to-one and small groups',

  // --- categories (and the copy denormalised into courses.category) ------
  '音樂': 'Music',
  '舞蹈': 'Dance',
  '學術': 'Academic',
  '樂理': 'Music Theory',
  '小提琴': 'Violin',
  '結他': 'Guitar',
  '鋼琴': 'Piano',
  '現代舞': 'Contemporary',
  '爵士舞': 'Jazz',
  '芭蕾': 'Ballet',
  '物理': 'Physics',
  '數學': 'Mathematics',

  // --- courses -----------------------------------------------------------
  // Kept short: these names sit in month-calendar chips beside a start time,
  // and a long one wraps the cell.
  '兒童鋼琴入門': 'Piano for Kids',
  '流行鋼琴班': 'Pop Piano',
  '古典結他': 'Classical Guitar',
  '樂理入門': 'Music Theory 1',
  '兒童小提琴': 'Violin for Kids',
  '中三數學': 'Form 3 Maths',
  '中四物理': 'Form 4 Physics',
  '數學樂理入門': 'Maths & Theory',
  '芭蕾初階': 'Beginner Ballet',
  '成人爵士舞': 'Adult Jazz',
  '現代舞基礎': 'Contemporary 1',
  'Hip Hop 基礎': 'Hip Hop Basics',
  'Popping & Locking': 'Popping & Locking',
  'Breaking 入門': 'Intro to Breaking',
  '私人鋼琴班': 'Private Piano',

  '5-8 歲初學者,從認譜到雙手彈奏。': 'Ages 5–8, from reading notes to playing with both hands.',
  '學習流行曲彈奏與簡易即興。': 'Play pop songs, plus simple improvisation.',
  '古典結他基礎指法與名曲賞析。': 'Classical fingerstyle fundamentals and repertoire study.',
  '五線譜、音程、和弦基礎。': 'Staff notation, intervals and basic chords.',
  '6-10 歲小提琴啟蒙,姿勢與基本運弓。': 'Ages 6–10: posture, bow hold and first pieces.',
  '代數、幾何重點溫習與操練。': 'Algebra and geometry revision, with drilled practice.',
  '力學與電學基礎,配合實驗講解。': 'Mechanics and electricity, taught alongside experiments.',
  '結合數學思維的樂理啟蒙。': 'Music theory taught through mathematical patterns.',
  '4-7 歲芭蕾啟蒙,基本手位與腳位。': 'Ages 4–7: basic arm and foot positions.',
  '零基礎成人班,一期一支完整舞蹈。': 'Adult beginners — one full routine per term.',
  '身體開發與即興,適合零基礎成人。': 'Conditioning and improvisation for adult beginners.',
  '基本律動、bounce 與 groove,零基礎入門。': 'Bounce, groove and basic rhythm — no experience needed.',
  '肌肉控制、pop 與 lock 的基本功。': 'Muscle control, and the fundamentals of pop and lock.',
  'Toprock、footwork 與 freeze,由地板動作開始。':
    'Toprock, footwork and freezes, starting on the floor.',
  '一對四小班,程度不限,彈性上課時間。': 'Four to a class, any level, flexible hours.',

  '銅鑼灣自組工作室': 'Causeway Bay studio',
  'A 室': 'Room A',
  'B 室': 'Room B',
  'C 室': 'Room C',
  '101 室': 'Room 101',
  '102 室': 'Room 102',
  '103 室': 'Room 103',
  '舞室 1': 'Studio 1',
  '舞室 2': 'Studio 2',
  '舞室 A': 'Studio A',
  '舞室 B': 'Studio B',

  // --- people ------------------------------------------------------------
  // Romanised to match the seeded email local-parts (wang@abc.com → Wong).
  '王小明': 'Wong Siu-ming',
  '林美華': 'Lam Mei-wah',
  '張老師': 'Ms Cheung',
  '陳志強': 'Chan Chi-keung',
  '何嘉欣': 'Ho Ka-yan',
  '鄭浩然': 'Cheng Ho-yin',
  '陳浩鋒': 'Chan Ho-fung',
  '李子朗': 'Lee Tsz-long',
  '周老師': 'Mr Chow',

  '主修鋼琴演奏,十年教學經驗,擅長帶領初學者。':
    'Piano performance major, ten years teaching, at her best with beginners.',
  '皇家芭蕾學院認證教師,舞台演出經驗十五年。':
    'Royal Academy of Dance certified, with fifteen years on stage.',
  '香港街舞比賽冠軍,教學十二年,專攻 Hip Hop 律動。':
    'Hong Kong street dance champion, twelve years teaching, focused on hip hop groove.',
  '獨立音樂導師,自組私人小班,不隸屬任何機構。':
    'Independent music tutor running private small-group classes.',

  '示範學生': 'Demo Student',
  '陳大文': 'Chan Tai-man',
  '李小娟': 'Lee Siu-kuen',
  '黃志明': 'Wong Chi-ming',
  '吳嘉欣': 'Ng Ka-yan',
  '何俊傑': 'Ho Chun-kit',
};

/**
 * Where to apply it. Plain columns are matched on equality; `json` entries
 * rewrite one key inside a JSONB blob.
 *
 * @type {Array<{ table: string, columns?: string[], json?: string, key?: string }>}
 */
export const DEMO_EN_TARGETS = [
  { table: 'companies', columns: ['name', 'description', 'address'] },
  { table: 'companies', json: 'theme', key: 'tagline' },
  { table: 'categories', columns: ['name'] },
  { table: 'courses', columns: ['name', 'description', 'location', 'category'] },
  { table: 'teachers', columns: ['name', 'bio'] },
  { table: 'teachers', json: 'theme', key: 'tagline' },
  { table: 'students', columns: ['name'] },
];
