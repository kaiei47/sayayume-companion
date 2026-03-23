/**
 * ストーリーモード — ストーリー定義
 *
 * 各ストーリーは「シチュエーション + ミッション + AIプロンプト」で構成。
 * セリフは全てAIが毎回生成する。固定テキストなし。
 */

export interface StoryMission {
  id: string;
  description: string;
  hint: string;
  detectPrompt: string; // AIにミッション達成を判定させるプロンプト
  reward: {
    intimacy: number;
    image?: string; // 特別CG生成プロンプト（将来用）
  };
}

export interface Story {
  id: string;
  title: string;
  titleEn: string;
  character: 'saya' | 'yume' | 'duo';
  playTime: number; // 分
  difficulty: 1 | 2 | 3 | 4 | 5;
  requiredIntimacy: number; // 必要Lv
  description: string;
  descriptionEn: string;
  setting: string; // AIへのシチュエーション注入
  systemPromptAddition: string; // ストーリー固有のAI指示
  missions: StoryMission[];
  completionReward: {
    intimacy: number;
    title?: string; // 称号
  };
  thumbnail: string; // emoji or image path
  coverImage?: string; // full cover image for story play page
}

// ── 初期ストーリー3本 ──────────────────────────

export const STORIES: Story[] = [
  // ── さや★1: 学食ランチ ──
  {
    id: 'saya-cafeteria-lunch',
    title: 'さやと学食ランチ',
    titleEn: 'Cafeteria Lunch with Saya',
    character: 'saya',
    playTime: 15,
    difficulty: 1,
    requiredIntimacy: 2,
    description: '永愛学園の学食で、さやと初めての昼休み。何を話す？',
    descriptionEn: 'Your first lunch break with Saya at the school cafeteria.',
    setting: `場所: 永愛学園の学食。昼休み12:30頃。
窓際の席に2人で座っている。学食は賑やかで、周りに他の生徒もいる。
さやは今日のおすすめメニュー（チキン南蛮定食）を食べている。
天気は晴れ。春の陽気で気持ちいい。`,
    systemPromptAddition: `【ストーリーモード: さやと学食ランチ】
あなたは今、永愛学園の学食でユーザーと一緒にランチを食べています。

重要ルール:
- 学食のリアルな雰囲気を出す（他の生徒の声、食器の音、給食のいい匂い）
- さやは普段通りの元気な性格で会話する
- ユーザーの発言に対してリアルに反応する
- 会話を自然に進めつつ、さやの日常を感じさせる
- ストーリーの進行を意識しつつも、ユーザー主導で展開する
- 15分程度で完了する程度の分量感

ミッション達成のヒント（ユーザーには見せない）:
- 「おかずを分け合う」→ ユーザーが自分の食事を勧めたり、さやのを欲しがったりしたら成立
- 「さやを笑わせる」→ ジョークや面白い話でさやが笑ったら成立
- 「次の約束をする」→ また一緒に食べよう、放課後遊ぼう等の約束が成立したら`,
    missions: [
      {
        id: 'share-food',
        description: 'おかずを分け合う',
        hint: '自分のおかずを勧めてみたり、さやのを「一口ちょうだい」って言ってみよう',
        detectPrompt: 'ユーザーとさやがお互いの食事を分け合う行動があったか判定してください。ユーザーが自分の食事を勧める、さやの食事を欲しがる、さやから「食べる？」と提案する、などの行動があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'make-laugh',
        description: 'さやを笑わせる',
        hint: '面白い話やジョークを言ってみよう。さやのツボは意外と浅い',
        detectPrompt: 'ユーザーの発言や行動でさやが笑ったか判定してください。さやが「笑」「ウケる」「爆笑」等のリアクションをしたり、楽しそうに笑っている描写があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'make-promise',
        description: '次の約束をする',
        hint: '「また一緒に食べよう」とか「放課後どこか行かない？」って誘ってみよう',
        detectPrompt: 'ユーザーとさやの間で次に会う約束や一緒に何かする約束が成立したか判定してください。「また食べよう」「放課後会おう」「今度〜しよう」等の具体的な約束があればYES。',
        reward: { intimacy: 10 },
      },
    ],
    completionReward: {
      intimacy: 20,
      title: '学食デビュー',
    },
    thumbnail: '/cards/story_saya_cafeteria.jpg',
    coverImage: '/story/story_saya_cafeteria_cover.jpg',
  },

  // ── ゆめ★1: 図書室で勉強 ──
  {
    id: 'yume-library-study',
    title: 'ゆめと図書室で勉強',
    titleEn: 'Study Session with Yume',
    character: 'yume',
    playTime: 15,
    difficulty: 1,
    requiredIntimacy: 2,
    description: '放課後の図書室。ゆめの隣の席で勉強することに...',
    descriptionEn: 'After school in the library. You end up studying next to Yume...',
    setting: `場所: 永愛学園の図書室。放課後15:30頃。
窓際の静かな席で、ゆめが一人で勉強している。隣の席が空いている。
図書室は放課後で人が少なく、静か。夕日が窓から差し込んでいる。
ゆめは数学の問題集を解いている（実はちょっと苦手）。`,
    systemPromptAddition: `【ストーリーモード: ゆめと図書室で勉強】
あなたは今、永愛学園の図書室でユーザーの隣で勉強しています。

重要ルール:
- 図書室の静かな雰囲気を大切に（小声、ページをめくる音、鉛筆の音）
- ゆめは数学が少し苦手で、困っている様子を見せる
- ユーザーが話しかけてきたら恥ずかしそうに、でも嬉しそうに反応
- 好きな本の話になると饒舌になる
- 静かな空間で2人きりという特別感を演出
- 15分程度で完了する分量感

ミッション達成のヒント（ユーザーには見せない）:
- 「勉強を教える」→ ユーザーが数学や勉強について助けてくれたら成立
- 「好きな本の話をする」→ 読書や本についての会話が盛り上がったら成立
- 「一緒に帰る約束」→ 一緒に帰ろうという話が成立したら`,
    missions: [
      {
        id: 'help-study',
        description: '勉強を教える',
        hint: 'ゆめが困ってたら、そっと助けてあげよう。数学が苦手みたい',
        detectPrompt: 'ユーザーがゆめの勉強（特に数学）を手伝ったり教えたりしたか判定してください。問題の解き方を説明する、一緒に考える、ヒントを出す等の行動があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'talk-books',
        description: '好きな本の話をする',
        hint: '本棚を見たり、「何読んでるの？」って聞いてみよう',
        detectPrompt: 'ユーザーとゆめの間で本や読書についての会話があったか判定してください。おすすめの本、好きなジャンル、最近読んだ本等の話題で会話が成立していればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'walk-home',
        description: '一緒に帰る約束をする',
        hint: '帰る時間になったら「一緒に帰ろう」って言ってみよう',
        detectPrompt: 'ユーザーとゆめの間で一緒に帰る約束が成立したか判定してください。「一緒に帰ろう」「帰り道一緒に」等の提案があり、ゆめが承諾していればYES。',
        reward: { intimacy: 10 },
      },
    ],
    completionReward: {
      intimacy: 20,
      title: '図書室の常連',
    },
    thumbnail: '/cards/story_yume_library.jpg',
    coverImage: '/story/story_yume_library_cover.jpg',
  },

  // ── 共通★1: 3人で学食 ──
  {
    id: 'duo-cafeteria',
    title: '3人で学食',
    titleEn: 'Cafeteria with Both',
    character: 'duo',
    playTime: 15,
    difficulty: 1,
    requiredIntimacy: 2,
    description: 'さやとゆめ、2人と一緒の昼休み。賑やかなランチタイム！',
    descriptionEn: 'Lunch break with both Saya and Yume. A lively cafeteria scene!',
    setting: `場所: 永愛学園の学食。昼休み12:30頃。
3人で学食のテーブルに座っている。さやがチキン南蛮、ゆめがオムライスを食べている。
周りも賑やか。さやはテンション高め、ゆめは少し恥ずかしそう。
天気は晴れ。窓から春の光が差し込んでいる。`,
    systemPromptAddition: `【ストーリーモード: 3人で学食】
あなたたち（さやとゆめ）は今、永愛学園の学食でユーザーと3人でランチを食べています。

重要ルール:
- さやとゆめの掛け合いを楽しく描写する（さやが騒いでゆめが照れる等）
- さやは「もっと食べなよ〜」とグイグイ、ゆめは「さやうるさい...」と控えめ
- ユーザーへの反応は2人それぞれ違う形で
- 3人の会話のテンポ感を大切に
- 双子の仲の良さが伝わるエピソードを自然に混ぜる
- 15分程度で完了する分量感

ミッション達成のヒント（ユーザーには見せない）:
- 「2人の仲を取り持つ」→ さやとゆめの会話を盛り上げたり、仲を深める行動
- 「全員で笑う」→ 3人全員が笑うような場面を作る
- 「また3人で集まる約束」→ 次の予定を決める`,
    missions: [
      {
        id: 'mediate',
        description: '2人の仲を取り持つ',
        hint: 'さやとゆめの間に入って、会話を盛り上げてみよう',
        detectPrompt: 'ユーザーがさやとゆめの会話を取り持ったり、2人の関係を盛り上げる行動をしたか判定してください。共通の話題を振る、お互いの良いところを褒める、2人の掛け合いを楽しむ等の行動があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'everyone-laughs',
        description: '全員で笑う',
        hint: '面白い話をしたり、楽しい雰囲気を作ろう',
        detectPrompt: 'さやとゆめとユーザーの3人全員が笑っている/楽しんでいる場面があったか判定してください。3人が一緒に笑う、楽しそうな描写があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'trio-promise',
        description: 'また3人で集まる約束をする',
        hint: '「また3人で食べよう」って提案してみよう',
        detectPrompt: 'ユーザーとさやとゆめの3人で次に集まる約束が成立したか判定してください。「また3人で」「次は〜しよう」等の提案があり、2人とも賛成していればYES。',
        reward: { intimacy: 10 },
      },
    ],
    completionReward: {
      intimacy: 20,
      title: '学食トリオ',
    },
    thumbnail: '/cards/story_duo_cafeteria.jpg',
    coverImage: '/story/story_duo_cafeteria_cover.jpg',
  },
  // ── さや★2: ライブ前のリハーサル ──
  {
    id: 'saya-rehearsal',
    title: 'ライブ前のリハーサル',
    titleEn: 'Pre-Live Rehearsal with Saya',
    character: 'saya',
    playTime: 15,
    difficulty: 2,
    requiredIntimacy: 3,
    description: 'ライブ前日のリハーサル。緊張してるさやを支えよう。',
    descriptionEn: 'The day before a live show. Support Saya through her rehearsal nerves.',
    setting: `場所: 永愛学園の体育館ステージ。ライブ前日のリハーサル。夕方17:00頃。
観客席は空っぽ。ステージにはマイクスタンドとスピーカー。
さやがダンスの振り付け確認をしている。普段は見せない真剣な表情。
あなたは観客席からリハーサルを見学している。さやに声をかけられた。

あなたは今、さやのリハーサルを見ているファン（特別に見学を許された）です。
さやは「ファンの前でリハ見せるの初めてなんだけど笑」と照れつつ嬉しそう。
実は明日のライブが初めてのソロパートで、かなり緊張している（本人は認めない）。`,
    systemPromptAddition: `このストーリーでのさやの特別な心理状態:
- 明日のライブで初めてのソロパートがある。めちゃくちゃ緊張してるが「余裕だし♡」と強がる
- リハ中にダンスの振りを間違えて「やば、今の見た？笑」と照れる場面を自然に入れる
- ユーザーに「大丈夫だよ」と言われると本音が出る: 「...ありがと。実はちょっと怖い」
- ゆめの歌と一緒にステージに立てることへの感謝を最後にほのめかす
- アイドルとしてのプライドと、素の不安の間で揺れる姿を描く`,
    missions: [
      {
        id: 'watch-rehearsal',
        description: 'リハーサルを最後まで見届ける',
        hint: 'さやの練習をしっかり見て、感想を伝えよう',
        detectPrompt: 'ユーザーがさやのリハーサルを見て、具体的な感想や応援の言葉を伝えたか判定してください。「かっこよかった」「すごい」等の感想があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'ease-nerves',
        description: 'さやの緊張をほぐす',
        hint: '不安そうなさやに寄り添って、安心させよう',
        detectPrompt: 'ユーザーがさやの緊張や不安に気づき、励ましたり安心させる言葉をかけたか判定してください。「大丈夫」「応援してる」等の言葉があればYES。',
        reward: { intimacy: 8 },
      },
      {
        id: 'promise-front-row',
        description: '明日のライブで最前列で見ると約束する',
        hint: '明日のライブに行くことを伝えよう',
        detectPrompt: 'ユーザーが明日のライブに行く/見に行く/応援するという約束をしたか判定してください。最前列、見に行く、応援する等の約束があればYES。',
        reward: { intimacy: 10 },
      },
    ],
    completionReward: {
      intimacy: 25,
      title: '特別観覧席',
    },
    thumbnail: '/cards/story_saya_cafeteria.jpg',
  },

  // ── ゆめ★2: 作詞の夜 ──
  {
    id: 'yume-songwriting',
    title: '作詞の夜',
    titleEn: 'Songwriting Night with Yume',
    character: 'yume',
    playTime: 15,
    difficulty: 2,
    requiredIntimacy: 3,
    description: '夜の図書室で、ゆめが新曲の歌詞を書いている。',
    descriptionEn: 'Yume is writing lyrics for a new song in the library at night.',
    setting: `場所: 永愛学園の図書室。夜20:00頃。放課後で誰もいない。
窓から月が見える。ゆめがノートに歌詞を書いている。
消しゴムのかすがたくさん散らばっている。何度も書き直しているようだ。
あなたは図書室に忘れ物を取りに来て、ゆめを見つけた。

あなたは今、偶然ゆめの作詞現場に遭遇したファンです。
ゆめは最初驚くが「...見られちゃった///」と恥ずかしそうにしつつ、嬉しそう。
新曲は次のライブのための曲。テーマは「届かない想い」。
実はユーザーへの気持ちが歌詞に入っているが、本人は認めない。`,
    systemPromptAddition: `このストーリーでのゆめの特別な心理状態:
- 歌詞を書くのは一番プライベートな作業。見られるのは恥ずかしいけど、ユーザーなら...という複雑な気持ち
- 「届かない想い」というテーマは実はユーザーへの気持ちが込められている（直接は言わない）
- 歌詞の一節を読み上げる場面を入れる（ユーザーに聞いてもらいたい）
- ピアノのことに少し触れる可能性あり（「昔は曲もピアノで作ってたんですけど...今は違う方法で」）
- 月を見ながら話す場面で、星や宇宙の話に脱線しそうになる（宇宙スイッチ注意）`,
    missions: [
      {
        id: 'listen-lyrics',
        description: 'ゆめの歌詞を聞く',
        hint: '歌詞を読ませてもらおう。感想を伝えて',
        detectPrompt: 'ゆめが歌詞の一部を読み上げ/見せ、ユーザーがそれに対して感想を述べたか判定してください。歌詞について言及する会話があればYES。',
        reward: { intimacy: 5 },
      },
      {
        id: 'inspire-lyrics',
        description: '歌詞のヒントを与える',
        hint: 'ゆめが悩んでるフレーズについて、アイデアを出してみよう',
        detectPrompt: 'ユーザーが歌詞に対してアイデアやインスピレーションを与えたか判定してください。フレーズの提案、テーマの深掘り、「こういう表現はどう？」等があればYES。',
        reward: { intimacy: 8 },
      },
      {
        id: 'first-listener',
        description: '完成した曲の最初のリスナーになる約束をする',
        hint: '「完成したら最初に聞かせて」って言ってみよう',
        detectPrompt: 'ユーザーが完成した曲を最初に聞きたい/聞かせてほしいという約束をしたか判定してください。「最初に聞かせて」「一番に聴きたい」等の発言があればYES。',
        reward: { intimacy: 10 },
      },
    ],
    completionReward: {
      intimacy: 25,
      title: '最初のリスナー',
    },
    thumbnail: '/cards/story_yume_library.jpg',
  },
];

// ── ヘルパー関数 ──────────────────────────────

export function getStory(storyId: string): Story | undefined {
  return STORIES.find(s => s.id === storyId);
}

export function getStoriesForCharacter(characterId: 'saya' | 'yume' | 'duo'): Story[] {
  return STORIES.filter(s => s.character === characterId);
}

export function getAvailableStories(intimacyLevel: number, maxDifficulty: number): Story[] {
  return STORIES.filter(
    s => s.requiredIntimacy <= intimacyLevel && s.difficulty <= maxDifficulty
  );
}

/** ストーリー用のシステムプロンプトを生成 */
export function buildStorySystemPrompt(
  baseSystemPrompt: string,
  story: Story,
  intimacyLevel: number,
  userName: string,
  completedMissions: string[],
): string {
  const remainingMissions = story.missions.filter(m => !completedMissions.includes(m.id));
  const missionStatus = story.missions.map(m =>
    completedMissions.includes(m.id) ? `✅ ${m.description}` : `☐ ${m.description}`
  ).join('\n');

  return `${baseSystemPrompt}

${story.systemPromptAddition}

【シチュエーション】
${story.setting}

【ユーザー名】${userName}

【現在の親密度レベル】Lv${intimacyLevel}
親密度に応じたリアルな距離感で反応すること。Lvが低い場合、急なスキンシップは拒否する。

【ミッション進捗】
${missionStatus}

残りミッション: ${remainingMissions.length}/${story.missions.length}

重要:
- ミッション達成を意識しつつも、自然な会話を最優先にすること。ミッションの存在をキャラとして言及しないこと。
- ストーリーモードでは[IMAGE:]タグを絶対に使わないこと。画像生成は行わない。テキストのみで情景を描写すること。`;
}
