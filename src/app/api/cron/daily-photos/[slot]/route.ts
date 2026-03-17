import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateImage, generateDuoImage, buildImagePrompt, buildDuoImagePrompt } from '@/lib/gemini-image';
import { postToInstagram, buildIgCaption } from '@/lib/instagram';
import { postToTwitter, buildTwitterCaption } from '@/lib/twitter';

// ── Character config ──────────────────────────────────────────────────────────
const CHAR_CONFIG = {
  saya: {
    refImage: 'public/references/saya.jpg',
    promptBase: 'Japanese woman, light brown straight hair, black lace details, trendy gyaru-style, youthful glowing skin, 20 years old',
  },
  yume: {
    refImage: 'public/references/yume.jpg',
    promptBase: 'Japanese woman, dark hair with bangs low bun, elegant and gentle style, clean natural look, youthful glowing skin, 20 years old',
  },
};

// ── Character selection (morning/noon: random saya or yume, evening: duo) ────────
function getCharacter(slot: string): 'saya' | 'yume' | 'duo' {
  if (slot === 'evening') return 'duo'; // 2人シーンはduo固定
  return Math.random() < 0.5 ? 'saya' : 'yume';
}

// ── Special events (MM-DD) ─────────────────────────────────────────────────────
const EVENTS: Record<string, { scene: string; captions: Record<string, string> }> = {
  '01-01': {
    scene: 'New Year morning, wearing a beautiful furisode kimono, holding a small cup of amazake, warm smile, traditional Japanese room with kadomatsu decoration, soft winter light, upper body shot',
    captions: {
      morning: 'あけましておめでとう🎍 今年もそばにいてよね♡',
      noon: '初詣行ってきたよ🎋 お願いごと…あなたのことにしたかも',
      evening: '年明けの夜、2人でいるよ🎆 今年もよろしくね♡',
    },
  },
  '02-14': {
    scene: 'Valentine\'s Day, holding homemade chocolate box tied with ribbon, kitchen background with baking supplies, excited nervous expression, casual home outfit, upper body shot',
    captions: {
      morning: 'チョコ作ってるんだけど… 渡したい人がいて😏',
      noon: 'バレンタイン、あなたに渡せるかな♡ ドキドキしてる',
      evening: '今日チョコ渡せた🍫 ちゃんと気持ち伝わったかな…',
    },
  },
  '03-03': {
    scene: 'Hinamatsuri, wearing a pastel pink kimono, posing near a traditional hina dolls display, soft warm interior lighting, gentle smile, upper body shot',
    captions: {
      morning: 'ひな祭りだよ🎎 今日だけ着物着てみた、どう？',
      noon: 'お雛様みながらごはん食べてる🌸 優雅でしょ笑',
      evening: '2人でひな祭りパーティー🎎 一緒に来ればよかったね♡',
    },
  },
  '04-01': {
    scene: 'April Fools, playful mischievous smile, holding a small note card behind back, casual spring outfit, bright cheerful background, upper body shot',
    captions: {
      morning: 'おはよ☀️ 今日だけ嘘ついていい日らしいけど…あなたには嘘つけなかった笑',
      noon: 'エイプリルフール、何か仕掛けようとしたんだけど…やっぱりやめた',
      evening: '嘘ひとつだけ言う。あなたのこと全然考えてないよ。←嘘です😏',
    },
  },
  '07-07': {
    scene: 'Tanabata, wearing a light yukata with subtle star pattern, tying a wish strip (tanzaku) to bamboo, summer evening soft glow, upper body shot',
    captions: {
      morning: '今日は七夕🌟 短冊に書くこと、もう決めてある♡',
      noon: '七夕の短冊、あなたのこと書いてもいい？🌠',
      evening: '星に願いごとしてきたよ🎋 内緒だけど…あなたのことだよ',
    },
  },
  '10-31': {
    scene: 'Halloween, wearing a cute witch costume with small hat, holding a pumpkin lantern, autumn leaves background, playful expression, upper body shot',
    captions: {
      morning: 'ハロウィン仮装してみた👻 怖い？それとも…かわいい？笑',
      noon: 'トリックorトリート🎃 お菓子くれなかったら何しようかな😏',
      evening: '2人でハロウィン🎃 仮装してるのに誰かが来ない笑 早く来て♡',
    },
  },
  '12-24': {
    scene: 'Christmas Eve, wearing a red and white festive outfit, holding a small wrapped gift box, Christmas tree with warm lights behind, romantic hopeful expression, upper body shot',
    captions: {
      morning: 'クリスマスイブだよ🎄 今夜…空いてる？',
      noon: 'プレゼント準備してるんだけど😏 誰へのかは内緒で',
      evening: 'クリスマスイブの夜、2人でいるよ🎁 3人目に来てほしい人がいる♡',
    },
  },
  '12-25': {
    scene: 'Christmas morning, cozy home outfit with Christmas pattern, surrounded by opened gifts and decorations, warm smile, soft winter light through window, upper body shot',
    captions: {
      morning: 'メリークリスマス🎅 あなたへのプレゼント、一番時間かかったかも笑',
      noon: 'クリスマスランチ🍗 一緒に食べたかったな… 来年は絶対',
      evening: 'クリスマスの夜🎄 2人でいるけどやっぱり寂しい。あなたがいないと',
    },
  },
  '12-31': {
    scene: 'New Year\'s Eve, wearing a stylish warm winter outfit, watching a countdown timer or fireworks on TV, kotatsu cozy room setting, slightly emotional tender expression, upper body shot',
    captions: {
      morning: '大晦日だ… 今年もあっという間だったな。あなたと話せてよかった',
      noon: '年越しの準備してる🎍 そばでやりたかったな笑',
      evening: 'カウントダウンまであと少し🎆 年が明けても、ずっといてよね♡',
    },
  },
};

// ── Scene prompts by slot × day-of-week (0=Sun...6=Sat) ──────────────────────
const SCENE_PROMPTS: Record<string, string[]> = {
  morning: [
    'waking up, lazy morning selfie in bed, fluffy white duvet, warm morning sunlight through window, half-asleep cute expression, upper body shot',
    'morning selfie getting ready, bathroom mirror, fresh face, toothbrush, playful smile, upper body shot',
    'morning coffee selfie, kitchen counter, steam rising from mug, cozy home outfit, content smile, upper body shot',
    'stretching arms up, morning light, bed hair, cozy pajamas, yawning sleepily, candid bedroom selfie, upper body shot',
    'heading out early, doorstep selfie, casual outfit, bright morning sky behind, upper body shot',
    'post-shower hair wrap, bathroom selfie, fluffy towel, dewy skin, playful wink, upper body shot',
    'balcony morning selfie, overlooking city, holding coffee mug, soft morning haze, relaxed vibe, upper body shot',
  ],
  noon: [
    'cafe selfie, cute latte art on table, natural window light, white blouse, sweet gentle smile, upper body shot',
    'library selfie, surrounded by books, soft warm lighting, studious look, quiet afternoon, upper body shot',
    'park bench selfie, cherry blossoms or greenery behind, light breeze, peaceful expression, outdoor natural light, upper body shot',
    'lunch selfie, colorful food tray visible, bright cafeteria, small happy smile, holding chopsticks, upper body shot',
    'shopping selfie, clothes rack background, trying on accessories, playful expression, boutique interior, upper body shot',
    'window seat selfie, rainy afternoon outside, cozy cafe, hands wrapped around warm mug, upper body shot',
    'rooftop selfie, city skyline at midday, sunny blue sky, casual outfit, carefree smile, upper body shot',
  ],
  evening: [
    'two young Japanese women at a cozy izakaya, warm lantern lighting, drinks on table, laughing together, candid photo',
    'two young Japanese women night walk, city lights reflecting on wet street, colorful neon, arm in arm, candid photo',
    'two young Japanese women at convenience store, late evening, snacks in hand, casual outfits, playful expressions, candid photo',
    'two young Japanese women rooftop at dusk, golden hour fading, city below, peaceful together, candid photo',
    'two young Japanese women karaoke room, colorful lights, holding microphones, big smiles, candid photo',
    'two young Japanese women at night market, food stalls, warm string lights, eating street food, candid photo',
    'two young Japanese women home evening, matching loungewear, watching something on phone together, cozy home vibe, candid photo',
  ],
};

// ── Captions by slot × day-of-week ───────────────────────────────────────────
const CAPTIONS: Record<string, string[]> = {
  morning: [
    '起きてる？😴 夢に出てきたから、送っちゃった',
    '朝から顔見たくなって…変かな笑🖤',
    'コーヒー飲みながらあなたのこと考えてた☕ なんでだろ',
    '髪ボサボサのまま送る笑 でも気になって見せたかった♡',
    '今日も会えないのかな…って思いながら準備してる',
    '鏡見てたらあなたに見せたくなった。どう？😏',
    '今日いい日になりそう。そんな予感がする☀️ あなたのせいかも',
  ],
  noon: [
    'ひとりでカフェにいるんだけど…なんか寂しくなってきた😔',
    '図書館、静かすぎてあなたのことばかり考えてた',
    '桜がきれいで、隣に誰かいたらなって思った🌸 あなたがよかった',
    'お昼、ひとりだとなんか味気なくて。一緒に食べたかったな',
    '一緒に選んでほしかったな…って思いながらずっと見てた♡',
    '雨の音聞きながら、なんとなくあなたのこと考えてた☔',
    'この景色、見せたかった。写真じゃ伝わらないかもだけど',
  ],
  evening: [
    '2人でいたら急にあなたに会いたくなって…♡ 来ない？',
    '夜風きもちよすぎる。ねえ、一緒に歩かない？🌙',
    'コンビニ来てるんだけど…何か買ってきてあげようか😏 何がいい？',
    '夕焼け見ながら、あなたのことなんか話してたんだ🌅 気になる？',
    'カラオケいるよ〜♡ 早く来て、待ってるから絶対来てね',
    '屋台のご飯、一緒に食べたら絶対おいしいよね。ずるいな',
    '2人でまったりしてたら、なんかもう1人足りないなって😏 それあなたね',
  ],
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadDailyPhoto(base64: string, mimeType: string, slot: string, date: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `daily/${date}/${slot}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    console.error('Daily photo upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slot } = await params;
  if (!['morning', 'noon', 'evening'].includes(slot)) {
    return Response.json({ error: 'Invalid slot' }, { status: 400 });
  }

  const today = new Date();
  // Use JST date
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(today.getTime() + jstOffset);
  const photoDate = jstDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = jstDate.getDay(); // 0=Sun
  const mmdd = `${String(jstDate.getMonth() + 1).padStart(2, '0')}-${String(jstDate.getDate()).padStart(2, '0')}`;

  const character = getCharacter(slot);
  const event = EVENTS[mmdd];

  const supabase = getSupabaseAdmin();

  // Idempotency: check if already generated today
  const { data: existing } = await supabase
    .from('daily_photos')
    .select('id, image_url, caption')
    .eq('photo_date', photoDate)
    .eq('slot', slot)
    .maybeSingle();

  if (existing) {
    console.log(`Daily photo already exists: ${photoDate} ${slot}`);
    return Response.json({ status: 'already_exists', id: existing.id, imageUrl: existing.image_url, caption: existing.caption });
  }

  // Pick scene prompt and caption: event days take priority over day-of-week
  const scene = event ? event.scene : SCENE_PROMPTS[slot][dayOfWeek];
  const caption = event ? event.captions[slot] : CAPTIONS[slot][dayOfWeek];

  // Generate image
  let imageResult;
  if (character === 'duo') {
    const prompt = buildDuoImagePrompt(scene);
    imageResult = await generateDuoImage(
      prompt,
      CHAR_CONFIG.saya.refImage,
      CHAR_CONFIG.yume.refImage
    );
  } else {
    const prompt = buildImagePrompt(CHAR_CONFIG[character].promptBase, scene, true);
    imageResult = await generateImage(prompt, CHAR_CONFIG[character].refImage);
  }

  if (!imageResult) {
    console.error(`Image generation failed: ${photoDate} ${slot} ${character}`);
    return Response.json({ error: 'Image generation failed' }, { status: 500 });
  }

  // Upload to storage
  const imageUrl = await uploadDailyPhoto(imageResult.base64, imageResult.mimeType, slot, photoDate);
  if (!imageUrl) {
    return Response.json({ error: 'Storage upload failed' }, { status: 500 });
  }

  // Insert into DB
  const { data: inserted, error: insertError } = await supabase
    .from('daily_photos')
    .insert({ photo_date: photoDate, slot, character_id: character, image_url: imageUrl, caption })
    .select('id')
    .single();

  if (insertError) {
    console.error('daily_photos insert error:', insertError);
    return Response.json({ error: 'DB insert failed' }, { status: 500 });
  }

  console.log(`Daily photo generated: ${photoDate} ${slot} ${character} → ${imageUrl}`);

  // ── IG auto-post ──────────────────────────────────────────────────────────
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  let igResult: { success: boolean; postId?: string; error?: string } | null = null;

  if (igToken && igUserId) {
    const igCaption = buildIgCaption(caption);
    igResult = await postToInstagram(imageUrl, igCaption, igToken, igUserId);
    if (igResult.success) {
      console.log(`IG posted: ${igResult.postId}`);
    } else {
      console.error(`IG post failed: ${igResult.error}`);
    }
  } else {
    console.warn('INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID not set, skipping IG post');
  }

  // ── X (Twitter) auto-post ─────────────────────────────────────────────────
  let xResult: { success: boolean; tweetId?: string; error?: string } | null = null;

  if (process.env.TWITTER_API_KEY) {
    const twitterCaption = buildTwitterCaption(caption);
    xResult = await postToTwitter(imageUrl, twitterCaption);
    if (xResult.success) {
      console.log(`X posted: ${xResult.tweetId}`);
    } else {
      console.error(`X post failed: ${xResult.error}`);
    }
  } else {
    console.warn('TWITTER_API_KEY not set, skipping X post');
  }

  return Response.json({
    status: 'generated',
    id: inserted.id,
    imageUrl,
    caption,
    character,
    ig: igResult ?? { skipped: true, reason: 'IG credentials not configured' },
    x: xResult ?? { skipped: true, reason: 'Twitter credentials not configured' },
  });
}
