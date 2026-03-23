# Japanese Romance Sim Game LP Design Research
## Actionable Design Patterns for SayaYume
### Researched: 2026-03-21

---

## Executive Summary

Analyzed 8 major Japanese game LPs: Blue Archive, Gakuen iDOLM@STER, Heaven Burns Red, Tokimeki Memorial, Angelique Luminalize, Love Plus, NIKKE, Uma Musume. The findings below are organized into **steal-able patterns** for the SayaYume companion app LP.

---

## 1. BLUE ARCHIVE (bluearchive.jp)

### First Viewport
- Full-screen hero visual with characters in a school setting
- Animated logo entrance (Logo animation is a signature Blue Archive branding element)
- Two custom Typekit font families (one for JP, one for EN) -- premium typography signals

### Character Presentation
- In-game: Live2D characters with idle animations, tap reactions, expression changes
- "Memorial Lobby" -- special Live2D home screen scenes that unlock as you bond with characters
- Website: Large character art with school/faction groupings

### What Makes It Premium
- **Dual custom web fonts** (not system fonts)
- School setting creates parasocial "daily life" feeling
- Character halos = instant visual identity/branding
- The "Memorial Lobby" concept is KEY: characters react to you = emotional investment

### Steal for SayaYume
- **Live2D-style idle animations on LP** (even subtle breathing/blinking CSS animations on character art)
- **School setting imagery** -- we already have Eiai Gakuen (永愛学園), lean into it HARD
- Custom web fonts (not just system fonts) for premium feel

---

## 2. GAKUEN iDOLM@STER (gakuen.idolmaster-official.jp)

### First Viewport
- Large logo + tagline: "君と出会い、夢に翔ける" (Meet you, soar toward dreams)
- Dominant character visual as hero image
- Pick Up carousel rotating featured content
- Purple/pink gradient color scheme

### Character Presentation (idol page: /idol/)
- **Central spotlight approach**: One character dominates the viewport
- **Voice sample buttons**: "自己紹介1" "自己紹介2" -- hear the character introduce herself
- **3D model viewer option** -- interact with the character model
- **PV (promotional video) playback** per character
- **Profile data**: Age, birthday, blood type, height, weight, three sizes
- **Personality narrative**: 100+ word description establishing character traits
- **Thumbnail carousel** at bottom to browse other idols

### What Makes It Premium
- Voice samples are the KILLER feature -- hearing the character makes her real
- 3D model viewer = "I can see her from every angle"
- Social sharing per character (fans share their favorite)
- Vivid purple/pink palette with gradients
- 3-platform download CTAs (App Store, Google Play, DMM)

### Steal for SayaYume
- **Voice sample buttons on character profiles** -- ElevenLabs TTS clips of Saya/Yume introducing themselves
- **Character spotlight layout**: One girl takes center stage, the other is accessible via thumbnail
- **Profile cards with personality stats** (birthday, blood type, hobbies) -- this is standard for romance games and we NEED it
- **Share buttons per character** -- fans share "my girl"

---

## 3. HEAVEN BURNS RED (heaven-burns-red.com)

### First Viewport
- Story chapter banner carousel (7 banners rotating)
- Strong narrative/cinematic focus -- story is the hero, not characters alone
- "好評配信中" (Now available) as primary CTA
- Dark, dramatic color scheme

### Character Presentation
- Full-body illustrations in a grid under "第31A部隊" (31A Unit)
- 6 main characters with linked detail pages
- Emphasis on team/unit rather than individual romance
- Creator credits prominently displayed (Jun Maeda + Key brand)

### What Makes It Premium
- **Creator pedigree as trust signal**: "麻枝准、15年ぶりの完全新作" (Jun Maeda's first new work in 15 years)
- Multi-language support (JP/KR/TW) with language selector
- Steam + Mobile + App Store = multi-platform presence
- Cinematic trailer carousel as hero

### Steal for SayaYume
- **Story/narrative as a hook in the hero section** -- not just "meet AI girls" but "your story with them begins"
- **Creator/tech pedigree**: "Powered by Gemini AI + professional voice acting" as trust signals
- **Video trailer in hero** -- even a 15-second character interaction demo video

---

## 4. TOKIMEKI MEMORIAL ~forever with you~ EMOTIONAL (konami.com/games/tokimeki/1r/)

### First Viewport
- Centered game logo with sakura petal decorations
- Clean, minimal white background
- Navigation: News / Introduction / Movie / Characters / System / Products / Screenshots
- "購入する" (Purchase) CTA in header

### Character Presentation -- THE GOLD STANDARD for romance games
- **14 character cards** each with:
  - Full-body art with **toggle between "original" and "new graphic" versions**
  - Voice actor credit
  - Height, birthday, blood type
  - Personality description
  - **3 voice clips per character** (ボイス1, 2, 3)
  - 4 screenshot comparisons
  - Social share buttons per character
- **EVS (voice synthesis) customization** -- the character says YOUR name

### What Makes It Premium
- Voice clips per character = emotional connection before download
- Art style toggle = respect for both nostalgia and modernity
- 30th anniversary positioning = "legendary franchise" feeling
- Detailed system explanations with annotated screenshots
- Multiple product tiers (standard ¥6,600 / deluxe ¥9,680)
- 14 retailer-specific bonus items

### Steal for SayaYume (HIGHEST PRIORITY)
- **Voice clips on character profiles** -- this is the #1 pattern across ALL romance game LPs
- **"System" section explaining game mechanics with annotated screenshots** -- show the chat UI, intimacy system, image generation
- **Multiple product tiers with clear feature comparison** -- we already have Free/Basic/Premium
- **Clean, white background with character art as the star** -- let the girls be the visual focus
- **Birthday/blood type/hobby profiles** -- essential for romance game fans
- **Sakura/seasonal decorative elements** -- subtle anime aesthetic cues

---

## 5. ANGELIQUE LUMINALIZE (gamecity.ne.jp/anmina/)

### First Viewport
- Catch phrase hero image
- 3 header banners (Trial / Products / News)
- Navigation with prominent logo

### Character Presentation
- 9 character thumbnails in horizontal list
- Clickable to individual detail pages
- Image-based text (not web fonts) for character names

### Visual Techniques
- **Parallax scrolling**: `background-position` shifts at 1/10 scroll speed
- **WOW.js scroll-triggered animations**: Elements animate in as you scroll
- **Colorbox modal galleries**: Click to expand images
- **Auto-playing slider** for promotional banners

### What Makes It Premium
- Parallax creates depth/sophistication
- Scroll-triggered animations reward scrolling behavior
- Modal galleries for immersive image viewing
- Staff credits section (character designer, voice actors)

### Steal for SayaYume
- **Parallax scrolling** -- even simple CSS parallax elevates perceived quality significantly
- **Scroll-triggered fade-in animations** (WOW.js or Framer Motion) -- elements appearing as you scroll
- **Modal image galleries** for character screenshots

---

## 6. LOVE PLUS EVERY (konami.com/games/loveplus/every/)

### First Viewport
- Game logo + tagline: "いつでも、どこでも。カノジョに会える" (Meet your girlfriend anytime, anywhere)
- App Store + Google Play download buttons immediately visible
- Service notices (the game has been discontinued)

### Character Presentation
- **3 heroines** each with:
  - Static illustrated portrait by illustrator 箕星太朗
  - Voice actor credit
  - Birthday, zodiac, hobbies, blood type
  - Personality description
  - Character dialogue snippet showing personality

### What Makes It Premium
- "Meet your girlfriend anytime, anywhere" -- tagline directly sells the fantasy
- Licensed voice actors from anime industry
- VR dating feature as differentiator
- Pre-registration milestone tracking (300,000+ registrations)

### Steal for SayaYume
- **"いつでも、どこでも" style tagline** -- sells the always-available companion fantasy
- **Character dialogue snippets on the LP** -- show actual chat examples
- **Milestone/social proof counter** -- "XXX users already chatting"

---

## 7. NIKKE (nikke-jp.com) -- Bonus Analysis

### First Viewport
- Game title + download CTAs (iOS/Android/PC) + QR codes
- Dark cinematic background

### Character Presentation
- **Interactive character carousel** with 14+ characters
- Each character shows: Name, voice actor, faction, 100-150 word personality description
- Emphasis on psychological depth over stats

### Visual Techniques
- **Skrollr-based parallax** with coordinate animations
- **Video integration** with inline playback
- **Lazy-loading images** + WebP format detection
- Dark backgrounds to make character art POP

### What Makes It Premium
- Dark theme = cinematic/mature feel
- Voice actress credits (Ishikawa Yui, Hanazawa Kana) = star power
- Detailed world-building lore section
- Multi-platform (iOS/Android/PC)

### Steal for SayaYume
- **Dark/moody backgrounds** make character art stand out dramatically
- **Character carousel** -- swipe through characters
- **QR code for mobile** -- instant PWA access from desktop LP
- **Psychological depth in character descriptions** -- not just "she's cute" but real personality

---

## 8. UMA MUSUME (umamusume.jp/character/) -- Bonus Analysis

### Character Grid Pattern
- **Responsive card grid**: 3 columns mobile, 7 columns desktop
- Each card: Portrait art + English name + Japanese name + VA credit
- **Sorting dropdown**: Default / Name (A-Z, Z-A) / Height
- **Search/filter box** for character discovery
- **Fade + slide-up animation** (0.7s, cubic-bezier easing) on card entrance
- **Hover effects**: Scale + reveal additional content

### What Makes It Premium
- Polished animation on every card entrance
- Dual-language naming (JP + EN)
- Sort/filter gives user control
- Progressive disclosure: basic info visible, details on click

### Steal for SayaYume
- **Card entrance animations** with staggered timing
- **Hover/tap micro-interactions** on character elements

---

## SYNTHESIS: Top Design Patterns to Steal (Priority Ranked)

### MUST HAVE (Implement for launch/LP redesign)

| # | Pattern | Seen In | Implementation for SayaYume |
|---|---------|---------|----------------------------|
| 1 | **Voice clips on character profiles** | TokiMemo, Gakumas, NIKKE | ElevenLabs TTS: Saya & Yume self-intro clips (15-30s each). Play button on LP. |
| 2 | **Character spotlight layout** | Gakumas, TokiMemo | Full-viewport character art. Saya on left half, Yume on right half. Click to focus. |
| 3 | **Profile cards (birthday/blood type/hobbies)** | ALL of them | Standard romance game expectation. Without this, we look amateur. |
| 4 | **Chat demo / dialogue snippets** | Love Plus | Show 3-4 actual chat bubbles on the LP. "This is what talking to Saya feels like." |
| 5 | **Emotional tagline** | Love Plus, Gakumas | Not "AI companion app" but "いつでも、さやとゆめに会える" or "Your story begins at Eiai Academy" |
| 6 | **Scroll-triggered animations** | Angelique, Uma Musume | Framer Motion fade-up on scroll for each section. Costs nothing, adds premium feel. |
| 7 | **Video/PV in hero section** | HBR, Gakumas, NIKKE | 15-30s trailer showing chat interaction, image generation, intimacy level-up |

### SHOULD HAVE (Week 2-4 post-launch)

| # | Pattern | Seen In | Implementation for SayaYume |
|---|---------|---------|----------------------------|
| 8 | **Parallax scrolling** | Angelique, NIKKE | CSS background-attachment: fixed on school background images |
| 9 | **Dark section for character art** | NIKKE, Blue Archive | Dark bg section where Saya & Yume art pops against dark gradient |
| 10 | **Custom web fonts** | Blue Archive (2 Typekit families) | Google Fonts JP (Noto Sans JP + accent font) minimum. Typekit if budget allows. |
| 11 | **Social share per character** | TokiMemo, Gakumas | "Share your favorite girl" buttons → viral loop |
| 12 | **Multi-platform badges** | ALL of them | PWA install badge + "Works on iPhone, Android, PC" icons |
| 13 | **System/mechanics section** | TokiMemo | Annotated screenshots: chat UI, intimacy bars, level-up rewards, image unlock |
| 14 | **Creator/tech pedigree** | HBR | "Powered by Google Gemini AI" / "Voice by ElevenLabs" as trust badges |

### NICE TO HAVE (Month 2+)

| # | Pattern | Seen In | Implementation for SayaYume |
|---|---------|---------|----------------------------|
| 15 | **Live2D / breathing animation** | Blue Archive | CSS animation: subtle breathing/blinking on character art (transform: scale) |
| 16 | **3D model viewer** | Gakumas | Not applicable (we're 2D) but could do image gallery carousel |
| 17 | **Seasonal decorations** | TokiMemo (sakura) | Sakura petals in spring, fireworks in summer -- CSS particle effects |
| 18 | **User milestone counter** | Love Plus | "1,234 users already chatting with Saya & Yume" -- real-time social proof |
| 19 | **Character carousel** | NIKKE | Swipeable character showcase if we add more characters later |

---

## Color & Typography Insights

### Color Patterns Observed
| Game | Primary Colors | Background | Character Art Treatment |
|------|---------------|------------|----------------------|
| Blue Archive | Sky blue + white | Light/school | Bright, cheerful |
| Gakumas | Purple + pink gradients | Light with accents | Vivid, idol-stage lighting |
| HBR | Dark blue + red | Dark/cinematic | Dramatic, moody |
| TokiMemo | White + sakura pink | Clean white | Art is the ONLY color |
| Angelique | Gold + navy | Elegant dark | Otome premium feel |
| Love Plus | Soft pastel + white | Clean white | Warm, approachable |
| NIKKE | Black + neon accents | Dark | Art POPS against dark |

### Recommendation for SayaYume
- **Primary**: Soft pink (#FF6B9D) + white -- matches romance/dating genre
- **Saya sections**: Bold pink/red accents (ギャル energy)
- **Yume sections**: Soft blue/lavender accents (清楚 energy)
- **Dark mode section**: One dark section mid-page for dramatic character art display
- **Typography**: Noto Sans JP (body) + one display font for headings

---

## LP Structure Recommendation (Based on Research)

```
SECTION 1: HERO (First Viewport)
├── Emotional tagline (not feature description)
├── Full-screen Saya + Yume character art (school uniforms)
├── Subtle CSS breathing animation on characters
├── "Start Free" CTA button (glowing/pulsing)
└── 15s auto-playing demo video (muted, chat interaction loop)

SECTION 2: CHARACTER SPOTLIGHT
├── Saya profile card (left)
│   ├── Full-body art
│   ├── Voice clip button (自己紹介)
│   ├── Profile: Birthday, blood type, hobbies, personality
│   └── Sample dialogue bubble
├── Yume profile card (right)
│   ├── Same structure
│   └── Visual contrast (pink vs blue accents)
└── "Which girl will you choose?" CTA

SECTION 3: EXPERIENCE DEMO (Dark background)
├── Chat UI mockup / actual screenshot
├── "This is what talking to Saya feels like"
├── 3-4 chat bubble examples
├── Image generation example
└── Intimacy level-up animation

SECTION 4: GAME SYSTEM
├── Annotated screenshots
├── Intimacy levels explained (Lv1-5 with icons)
├── Free vs Basic vs Premium comparison
├── "Unlock deeper conversations" progression hook
└── Pricing cards

SECTION 5: SOCIAL PROOF
├── User count / testimonials
├── "Powered by Gemini AI" tech badge
├── PWA install instructions (iPhone + Android icons)
└── App screenshots gallery

SECTION 6: FINAL CTA
├── Saya + Yume together (different art from hero)
├── "さやとゆめが待ってるよ♡" (Saya and Yume are waiting for you)
├── Large "Start Free" button
└── "No app store needed. Start in 10 seconds."
```

---

## Key Insight: What Separates Premium from Cheap

After analyzing all 8 sites, the difference between "premium romance game LP" and "cheap/amateur" comes down to:

1. **VOICE** -- Every premium game LP has voice samples. No voice = no emotional connection = cheap.
2. **CHARACTER DEPTH** -- Birthday/blood type/hobbies are NOT optional. They're genre expectations. Missing them signals "this isn't a real romance game."
3. **MOTION** -- Even subtle scroll animations and hover effects. Static pages feel dead. Characters should feel alive.
4. **TYPOGRAPHY** -- System fonts = instant cheap signal. Custom fonts = instant premium signal.
5. **WHITE SPACE** -- Premium LPs let character art breathe. Cheap LPs cram everything together.
6. **EMOTIONAL COPY** -- Premium: "Your story begins here." Cheap: "AI chatbot with image generation."

---

## Sources
- [Blue Archive JP](https://bluearchive.jp/)
- [Gakuen iDOLM@STER](https://gakuen.idolmaster-official.jp/)
- [Gakuen iDOLM@STER Character Page](https://gakuen.idolmaster-official.jp/idol/)
- [Heaven Burns Red](https://heaven-burns-red.com/)
- [Tokimeki Memorial Emotional](https://www.konami.com/games/tokimeki/1r/)
- [Tokimeki Memorial Portal](https://www.konami.com/games/tokimeki/)
- [Angelique Luminalize](https://www.gamecity.ne.jp/anmina/)
- [Love Plus EVERY](https://www.konami.com/games/loveplus/every/)
- [NIKKE](https://nikke-jp.com/)
- [Uma Musume Character Page](https://umamusume.jp/character/)
