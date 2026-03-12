#!/bin/bash
# Generate LP photo gallery images
# Usage: bash scripts/gen_photos.sh

set -e
OUT="public/references/photos"
SAYA_REF="$HOME/ClaudeCode/sns/models/saya_collection/base_saya.jpeg"
YUME_REF="$HOME/ClaudeCode/sns/models/yume_collection/base_yume.png"
DUO_REF="$HOME/ClaudeCode/sns/models/duo_collection/base_new.png"
TOOL="python3 $HOME/ClaudeCode/sns/tools/gemini_img.py"

cd /Users/yoshihidemaruyama/ClaudeCode/companion
mkdir -p "$OUT"

echo "=== さや 自撮り 4枚 ==="

$TOOL \
  --ref "$SAYA_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with light brown wavy hair taking a selfie, wearing cozy cream knit sweater, cute peace sign pose, big bright smile, cafe bokeh background, warm natural light, beauty lighting, soft frontal lighting, no harsh shadows, portrait bust-up, selfie angle" \
  --output "$OUT/saya_s1.jpg" && echo "saya_s1 done" && sleep 4

$TOOL \
  --ref "$SAYA_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with light brown wavy hair taking a selfie, wearing casual pink hoodie, winking playfully, sweet smile, indoor room background, warm cozy lighting, beauty lighting, soft frontal lighting, no harsh shadows, portrait bust-up, selfie angle" \
  --output "$OUT/saya_s2.jpg" && echo "saya_s2 done" && sleep 4

$TOOL \
  --ref "$SAYA_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with light brown wavy hair taking a selfie, wearing black mini dress, confident smile, evening city lights bokeh background, soft beauty lighting, no harsh shadows on face, portrait bust-up, selfie angle" \
  --output "$OUT/saya_s3.jpg" && echo "saya_s3 done" && sleep 4

$TOOL \
  --ref "$SAYA_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with light brown wavy hair taking a selfie in bed, wearing white oversized tee pajama, sleepy morning smile, messy hair cute, warm morning light from window, beauty lighting, soft frontal lighting, portrait bust-up, selfie angle" \
  --output "$OUT/saya_s4.jpg" && echo "saya_s4 done" && sleep 4

echo "=== ゆめ 自撮り 4枚 ==="

$TOOL \
  --ref "$YUME_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with dark hair and bangs taking a selfie, wearing white blouse, sweet gentle smile, holding coffee cup, cafe window natural light background, beauty lighting, soft frontal lighting, no harsh shadows, portrait bust-up, selfie angle" \
  --output "$OUT/yume_s1.jpg" && echo "yume_s1 done" && sleep 4

$TOOL \
  --ref "$YUME_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with dark hair and bangs taking a selfie, wearing cozy cream knit sweater, soft shy smile, bedroom window light background, warm afternoon light, beauty lighting, no harsh shadows on face, portrait bust-up, selfie angle" \
  --output "$OUT/yume_s2.jpg" && echo "yume_s2 done" && sleep 4

$TOOL \
  --ref "$YUME_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with dark hair and bangs taking a selfie, wearing light blue cardigan, dreamy gentle expression, bokeh fairy lights background, warm evening light, beauty lighting, soft frontal lighting, no harsh shadows, portrait bust-up, selfie angle" \
  --output "$OUT/yume_s3.jpg" && echo "yume_s3 done" && sleep 4

$TOOL \
  --ref "$YUME_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with dark hair and bangs taking a selfie, wearing casual lavender t-shirt, warm sweet smile, park outdoor background cherry blossom, soft natural daylight, beauty lighting, no harsh shadows on face, portrait bust-up, selfie angle" \
  --output "$OUT/yume_s4.jpg" && echo "yume_s4 done" && sleep 4

echo "=== DUO 自撮り 2枚 ==="

$TOOL \
  --ref "$DUO_REF" --aspect "3:4" --size "2K" \
  --prompt "Two young Japanese women taking a selfie together, left woman with light brown wavy hair wearing black top smiling brightly, right woman with dark hair and bangs wearing white blouse smiling sweetly, cafe background warm light, both looking at camera, portrait bust-up, selfie angle, beauty lighting" \
  --output "$OUT/duo_s1.jpg" && echo "duo_s1 done" && sleep 4

$TOOL \
  --ref "$DUO_REF" --aspect "3:4" --size "2K" \
  --prompt "Two young Japanese women taking a selfie together cheek to cheek, left woman with light brown wavy hair wearing stylish outfit doing peace sign, right woman with dark hair and bangs wearing cute dress with big smile, evening bokeh lights background, portrait bust-up, beauty lighting, soft frontal lighting" \
  --output "$OUT/duo_s2.jpg" && echo "duo_s2 done" && sleep 4

echo "=== LOCKED 画像 2枚 ==="

$TOOL \
  --ref "$SAYA_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with light brown wavy hair, wearing black lingerie top, confident sexy expression, bedroom soft pink lighting, beauty lighting, soft frontal lighting, no harsh shadows on face, portrait bust-up, close up" \
  --output "$OUT/saya_locked.jpg" && echo "saya_locked done" && sleep 4

$TOOL \
  --ref "$YUME_REF" --aspect "3:4" --size "2K" \
  --prompt "Young Japanese woman with dark hair and bangs, wearing white lace camisole, innocent shy expression, soft bedroom lighting, warm light from bedside lamp, beauty lighting, soft frontal lighting, no harsh shadows on face, portrait bust-up, close up" \
  --output "$OUT/yume_locked.jpg" && echo "yume_locked done"

echo "=== 全生成完了！ ==="
ls -la "$OUT/"
