# UI Redesign Research Report: Romance Game & AI Companion App Patterns

> Research Date: 2026-03-21
> Scope: Login, Dashboard/Home, Chat, Story Mode, Pricing, Settings
> Design System: Dark theme, pink/purple accents, #0a0a1a base

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color & Typography System](#2-color--typography-system)
3. [CSS Techniques & Animations](#3-css-techniques--animations)
4. [Page-by-Page Design Patterns](#4-page-by-page-design-patterns)
   - [Login Page](#41-login-page)
   - [Home/Dashboard](#42-homedashboard)
   - [Chat Interface](#43-chat-interface)
   - [Story Mode](#44-story-mode)
   - [Pricing Page](#45-pricing-page)
   - [Settings Page](#46-settings-page)
5. [Bottom Navigation](#5-bottom-navigation)
6. [Reference Apps & URLs](#6-reference-apps--urls)

---

## 1. Design Philosophy

### Key Insight from Research

The best romance game UIs share one principle: **the UI should never draw attention to itself -- it should be a natural extension of the emotional experience** (Source: FuwaNovel UI Anatomy). The UI exists to deepen the player's connection to the character, not to showcase the interface.

### Three Pillars for SayaYume Redesign

1. **Immersion First**: Every screen should feel like you're inside the world with Saya and Yume, not using an "app"
2. **Emotional Progression is Visible**: Relationship depth should be felt through visual changes (color warmth, unlock animations, character expressions)
3. **Game Feel, Not Tool Feel**: Interactions should have weight -- micro-animations, sound cues, particle effects, satisfying transitions

### Lessons from Top References

| Source | Key Lesson |
|--------|-----------|
| **Blue Archive** | Flat 2.0 design with selective transparency. Home screen idles into character-only view after inactivity, deepening intimacy feel |
| **Gakuen IdolMaster** | Glassmorphism text boxes reduce visual noise. Vivid accent colors on key CTAs. Icon-heavy layout reduces text clutter |
| **Genshin Impact** | No "home screen" -- you're immediately IN the world. UI elements are semi-transparent to never occlude the character |
| **Honkai: Star Rail** | Consistent slide-in/slide-out transitions. Pop-up hierarchy (overlay vs transparent menu vs full-screen) |
| **Replika** | 3D avatar in a decoratable room creates ownership. Gamified XP/mood system |
| **Kindroid** | Facial expressions and body language displayed in chat. Clean, uncluttered modern UI |
| **Nomi** | Group chat feature. Voice + photo generation integrated naturally into chat flow |
| **Tokimeki Memorial** | 6-tier affinity system (ときめき→キライ) with heart panel + face icon. Monthly parameter checks affect relationship |

---

## 2. Color & Typography System

### Color Palette (Extended from current LP)

```css
/* Base colors */
--bg-deepest:    #060612;   /* Absolute background */
--bg-deep:       #0a0a1a;   /* Primary background */
--bg-surface:    #0f0f24;   /* Card/panel surface */
--bg-elevated:   #161633;   /* Elevated elements */
--bg-glass:      rgba(255, 255, 255, 0.03); /* Glassmorphism panels */

/* Character accent colors */
--saya-primary:  #FF4D8D;   /* Saya pink - energetic, bold */
--saya-glow:     #FF4D8D33; /* Saya glow (20% opacity) */
--saya-gradient: linear-gradient(135deg, #FF4D8D, #FF6BA6);

--yume-primary:  #8B5CF6;   /* Yume purple - gentle, mysterious */
--yume-glow:     #8B5CF633;
--yume-gradient: linear-gradient(135deg, #8B5CF6, #A78BFA);

--duo-gradient:  linear-gradient(135deg, #FF4D8D, #8B5CF6); /* Combined */

/* UI accent */
--accent-gold:   #FFD700;   /* Achievements, premium, stars */
--accent-blue:   #3B82F6;   /* Info, links */
--success:       #10B981;   /* Online status, completed */
--warning:       #F59E0B;   /* Notifications */

/* Text hierarchy */
--text-primary:   rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.60);
--text-tertiary:  rgba(255, 255, 255, 0.35);
--text-ghost:     rgba(255, 255, 255, 0.15);
```

### Typography Scale

```css
/* Font stack: Use a rounded, friendly sans-serif */
font-family: 'Inter', 'Noto Sans JP', system-ui, sans-serif;

/* Hierarchy */
--text-hero:     2.5rem / 1.1 / 700;   /* Landing hero */
--text-title:    1.5rem / 1.2 / 700;   /* Page titles */
--text-heading:  1.125rem / 1.3 / 600; /* Section headings */
--text-body:     0.9375rem / 1.5 / 400;/* Body text (15px) */
--text-caption:  0.8125rem / 1.4 / 400;/* Captions (13px) */
--text-tiny:     0.6875rem / 1.3 / 500;/* Badges, tags (11px) */
```

### Key Typography Rules

- **Japanese text**: Use `Noto Sans JP` weight 400/700 only (500/600 render poorly at small sizes)
- **Numbers/stats**: Use tabular figures (`font-variant-numeric: tabular-nums`) for counters and EXP bars
- **Emotional text** (character dialogue): Slightly larger (16-17px) with more line-height (1.6)

---

## 3. CSS Techniques & Animations

### Glassmorphism (Core Visual Language)

```css
/* Primary glass panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1rem;
}

/* Elevated glass (for modals, active cards) */
.glass-elevated {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Character-tinted glass */
.glass-saya {
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.06), rgba(255, 255, 255, 0.02));
  border-color: rgba(255, 77, 141, 0.12);
}
.glass-yume {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(255, 255, 255, 0.02));
  border-color: rgba(139, 92, 246, 0.12);
}
```

### Ambient Glow Effects

```css
/* Behind character images on home screen */
.character-glow {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: radial-gradient(circle at center,
    var(--saya-glow) 0%,
    transparent 60%
  );
  filter: blur(60px);
  opacity: 0.5;
  animation: pulse-glow 4s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.05); }
}
```

### Micro-Interactions (Game Feel)

```css
/* Button press -- game-like feedback */
.btn-game {
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}
.btn-game:active {
  transform: scale(0.96);
}
.btn-game:hover {
  box-shadow: 0 0 20px var(--saya-glow);
}

/* Card hover -- subtle float */
.card-float:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

/* Heart beat animation for intimacy level up */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.3); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}

/* EXP bar fill */
@keyframes exp-fill {
  from { width: 0%; }
  to { width: var(--progress); }
}

/* Sparkle effect (CSS-only) */
@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
}

/* Notification badge pulse */
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 141, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(255, 77, 141, 0); }
}
```

### Page Transitions

```css
/* Slide-in from right (navigating deeper) */
@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Fade-up (content appearing) */
@keyframes fade-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Staggered children animation */
.stagger-children > * {
  animation: fade-up 0.4s ease-out both;
}
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.10s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.20s; }
```

---

## 4. Page-by-Page Design Patterns

---

### 4.1 Login Page

#### Research Findings

**How games handle login:**
- Games always show **full character art** as the focal point, with the form as secondary
- "Play as Guest" dramatically reduces friction (researched pattern: allow guest play, link accounts later)
- Social login (Google/LINE) should be the primary path -- email is secondary
- Top AI companion apps (Replika, Kindroid) use an **onboarding quiz** to make the AI feel "earned"

**What reduces signup friction (Source: Mobile Game Onboarding research):**
- One-tap login (Google/LINE) is first
- Minimal fields (email + password only, no username at signup)
- Show the VALUE before asking for signup (demo chat, character teaser)
- "Guest mode" = instant gratification, convert later

#### Recommended Design

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌─────────────────────┬──────────────────────┐  │
│  │                     │                      │  │
│  │   FULL CHARACTER    │   Glass panel form    │  │
│  │   ART (Saya+Yume)   │                      │  │
│  │                     │   [Google Login]      │  │
│  │   with ambient      │   [LINE Login]        │  │
│  │   glow behind       │                      │  │
│  │   them              │   ── or email ──     │  │
│  │                     │                      │  │
│  │   Floating          │   [email field]       │  │
│  │   particles /       │   [password field]    │  │
│  │   sakura petals     │   [Login button]      │  │
│  │                     │                      │  │
│  │   "おかえり♡"       │   [Guest mode link]   │  │
│  │   or                │                      │  │
│  │   "はじめまして"    │                      │  │
│  │                     │                      │  │
│  └─────────────────────┴──────────────────────┘  │
│                                                  │
│  Mobile: Character art as background,            │
│  form overlaid with glassmorphism                │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Left panel**: Replace the two small portrait photos with a SINGLE large illustration showing both Saya and Yume together (like a game title screen). The art should fill the entire left panel edge-to-edge.
2. **Ambient effects**: Add floating sakura petals (already have the keyframe) + pulsing glow behind characters
3. **Form panel**: Apply glassmorphism (`glass-elevated` class). Currently using plain `bg-background` -- should feel like a frosted glass card floating over the scene.
4. **Mobile**: Instead of showing a small icon + "さやゆめ" text, show the character art as a full-bleed background with the form overlaid using glass styling. The mobile experience should feel like opening a game, not a web form.
5. **CTA hierarchy**: Google/LINE buttons should be visually dominant (current is good). Email form should feel clearly secondary.
6. **Add "sparkle" on the login button**: Subtle animated gradient border or shimmer effect on the primary CTA.

#### Tailwind Implementation Notes

```tsx
// Mobile: full-bleed character background
<div className="min-h-dvh relative">
  {/* Full character art background */}
  <Image src="/art/saya_yume_titlescreen.jpg" fill className="object-cover object-top" />
  {/* Dark gradient overlay for readability */}
  <div className="absolute inset-0 bg-gradient-to-t from-[#060612] via-[#060612]/80 to-transparent" />
  {/* Glass form panel */}
  <div className="relative z-10 flex items-end min-h-dvh pb-8 px-6">
    <div className="w-full backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6">
      {/* form content */}
    </div>
  </div>
</div>
```

---

### 4.2 Home/Dashboard

#### Research Findings

**Blue Archive pattern:**
- Home screen shows ONE character prominently (the "main" partner)
- After idle, all UI fades away leaving only the character -- this creates an intimate "just us" feeling
- "MomoTalk" (LINE-like in-game messenger) is a core navigation element
- Left side has quick-access icons, bottom has main navigation

**Gakuen IdolMaster pattern:**
- Home screen uses large character art as background
- Mission banner with vivid "TAP!" accent draws attention to daily tasks
- Parameters (stats) use CMY colors for accessibility
- Icon-heavy layout reduces text noise

**Gacha game common patterns:**
- Top bar: Currency/gems/stamina display with "+" buttons
- Center: Large character display
- Left sidebar: Missions/events
- Bottom: Navigation tabs
- Red notification badges on everything actionable
- "Daily login bonus" popup

**What makes a dashboard feel "alive":**
- Character has idle animations (blinking, slight movement)
- Time-of-day greeting changes
- Weather/seasonal elements in background
- Notification badges that pulse
- Live event banners that rotate

#### Recommended Design

```
┌─────────────────────────────────────────┐
│  Header: Logo  |  🔔 notifications     │
│  ┌───────────────────────────────────┐  │
│  │  Greeting banner (time-based)    │  │
│  │  "おはよう、{name}♡"             │  │
│  │  "さやとゆめが待ってるよ"         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  SAYA    │  │  YUME    │  Character │
│  │  card    │  │  card    │  Cards     │
│  │  ♡Lv.3  │  │  ♡Lv.2  │  (large)   │
│  │  EXP bar │  │  EXP bar │            │
│  │ "話す"   │  │ "話す"   │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  📸 Today's Photo                │  │
│  │  [AI-generated daily photo]       │  │
│  │  Caption + "Reply" button         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  🎯 Daily Missions               │  │
│  │  □ Chat with Saya     +10 EXP    │  │
│  │  ■ Send a photo       +15 EXP    │  │
│  │  □ Complete a story   +20 EXP    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  📷 Photo Album (horizontal)     │  │
│  │  [img] [img] [img] [img] →       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Bottom Nav ──                       │
│  🏠  💬  📖  ⚙️                        │
└─────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Character cards**: Currently plain list items. Should become **large visual cards** (like gacha game character selection) with:
   - Character portrait taking up 60% of the card
   - Glassmorphism overlay at the bottom with name + intimacy level
   - Heart-shaped EXP progress bar (not a plain bar)
   - Pulsing glow border in character's accent color
   - Subtle parallax tilt on hover/touch (CSS `perspective` + `transform`)

2. **Greeting banner**: Currently just text. Should be a **glassmorphism card with character-specific greeting** that changes by:
   - Time of day (morning/noon/evening)
   - Intimacy level (higher level = more intimate greeting)
   - With small character avatar speaking the greeting

3. **Daily photo section**: Currently a simple image card. Should feel like receiving a **"message" from the character**:
   - Styled like a notification/message card
   - Character avatar on the left
   - Photo with rounded corners + subtle glow
   - "Reply to this photo" CTA that goes to chat

4. **Mission board**: Add a **glassmorphism mission panel** with:
   - Checkbox-style completion markers
   - EXP reward amounts with gold accent
   - Progress bar showing "3/5 missions complete today"
   - Subtle confetti/sparkle when completing a mission

5. **Add idle timeout behavior** (Blue Archive pattern): After 15 seconds of no interaction, fade out all UI panels with a slow animation, leaving just the character art + ambient glow. Tap anywhere to restore UI.

6. **Photo album**: Use a horizontal scroll with snap scrolling. Each photo should have:
   - Rounded corners + subtle border glow
   - Heart overlay for favorites
   - Character tag (Saya/Yume)

#### Key CSS for Character Cards

```css
/* Character card with tilt effect */
.char-card {
  position: relative;
  border-radius: 1.25rem;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  transform-style: preserve-3d;
  perspective: 800px;
}

.char-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(6, 6, 18, 0.95) 0%,
    rgba(6, 6, 18, 0.4) 40%,
    transparent 100%
  );
  z-index: 1;
}

/* Heart-shaped progress indicator (via clip-path or SVG) */
.heart-progress {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.heart-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #FF4D8D, #FF6BA6);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 4.3 Chat Interface

#### Research Findings

**Visual novel dialogue patterns:**
- Character portrait/sprite visible during conversation (usually bottom-left or right)
- Text box at the bottom with semi-transparent background
- Speaker name displayed with accent color
- Choice buttons appear as overlay cards

**What makes chat feel "romantic" vs "utilitarian":**
- **Romantic**: Warm color bubbles, character avatar visible, typing indicator with personality (e.g., "さや is typing..." with bouncing dots), message entry field with warm border glow, photo messages with film-strip framing
- **Utilitarian**: Plain gray bubbles, no character presence, standard loading spinners

**Kindroid innovation**: Beyond text, the AI's **facial expressions and body language** are displayed in the chat, making it feel like reading a story

**Chat bubble design best practices:**
- User messages: Solid accent color (pink/purple gradient)
- AI messages: Glass/transparent with subtle border
- Photo messages: Larger display with rounded corners, slight shadow
- System messages (level up, etc.): Centered, gold accent, with animation

#### Recommended Design

```
┌─────────────────────────────────────────┐
│  Header: ← | [Avatar] さや ● online   │
│           Lv.3 ♡♡♡♡♡♡♡ [☰ menu]      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ AI message ─────────────────────┐  │
│  │ [avatar]  Glass bubble           │  │
│  │           "おはよ〜♡ 今日は      │  │
│  │            どうだった？"          │  │
│  └──────────────────────────────────┘  │
│                                         │
│              ┌─ User message ────────┐  │
│              │  Gradient bubble      │  │
│              │  "仕事疲れた〜"       │  │
│              └───────────────────────┘  │
│                                         │
│  ┌─ AI message with photo ──────────┐  │
│  │ [avatar]                          │  │
│  │  ┌──────────────┐                │  │
│  │  │              │  Photo with    │  │
│  │  │  [photo]     │  rounded       │  │
│  │  │              │  corners       │  │
│  │  └──────────────┘                │  │
│  │  "元気出して♡ はい、笑って！"    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─ Level up notification ──────────┐  │
│  │   ✨ 親密度 Lv.3 → Lv.4 ✨      │  │
│  │   "心を開いてくれてありがとう"    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ── Typing indicator ──                 │
│  [avatar] ● ● ●                        │
│                                         │
├─────────────────────────────────────────┤
│  [📷] [message input field...] [Send▶] │
│  Intimacy mini-bar: ♡───────────65%    │
└─────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Chat header redesign**:
   - Show character avatar (circular, with colored ring matching character)
   - "Online" status with green dot
   - Mini intimacy bar under the name (thin, 2px height)
   - Hamburger menu for conversation list, settings, etc.
   - Background: `glass-panel` style, not solid black

2. **Message bubbles**:
   - **AI bubbles**: Glassmorphism style (`bg-white/[0.04] backdrop-blur-md border border-white/[0.06]`). Left-aligned with character avatar.
   - **User bubbles**: Gradient fill (`from-pink-600/80 to-purple-600/80`). Right-aligned, no avatar.
   - **Both**: Rounded corners (1.25rem) with `rounded-tl-sm` for AI (to point to avatar) and `rounded-tr-sm` for user
   - Add subtle fade-in + slide-up animation on new messages

3. **Photo messages**: Display with a **polaroid-style frame** effect:
   - White border (2px) + slight rotation (1-2deg random)
   - Soft shadow
   - Tap to expand in lightbox

4. **Level-up notifications**: Should appear as a **special centered card** with:
   - Gold gradient border
   - Sparkle particle animation
   - Heart beat animation on the level number
   - Character's special message in italics

5. **Typing indicator**: Give it personality:
   - Show character's mini avatar next to the dots
   - Dots should be in the character's accent color
   - Add random variation to dot timing (feels more human)

6. **Input area**:
   - Glass background for the input bar
   - Pink/purple gradient glow on the input field when focused
   - Send button: Circular with gradient fill, scale animation on tap
   - Camera button with subtle bounce
   - Show a thin intimacy progress bar above the input (always visible, updates on each message)

7. **Background**: Instead of pure black, use a very subtle gradient or pattern:
   - `bg-gradient-to-b from-[#0a0a1a] to-[#0d0818]`
   - Optional: very faint star-like dots pattern

#### Key CSS for Chat Bubbles

```css
/* AI message bubble */
.bubble-ai {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
  padding: 0.75rem 1rem;
  max-width: 80%;
  animation: chat-fade-in 0.3s ease-out;
}

/* User message bubble */
.bubble-user {
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.7), rgba(139, 92, 246, 0.7));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem 1.25rem 0.25rem 1.25rem;
  padding: 0.75rem 1rem;
  max-width: 80%;
  animation: chat-fade-in 0.3s ease-out;
}

/* Saya-specific tint for AI bubbles */
.bubble-ai-saya {
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.06), rgba(255, 255, 255, 0.03));
  border-color: rgba(255, 77, 141, 0.08);
}

/* Yume-specific tint */
.bubble-ai-yume {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(255, 255, 255, 0.03));
  border-color: rgba(139, 92, 246, 0.08);
}
```

---

### 4.4 Story Mode

#### Research Findings

**Visual novel chapter selection patterns:**
- Chapters displayed as **cards or panels** with:
  - Chapter number + title
  - Thumbnail illustration
  - Lock/unlock status
  - Star rating or completion marks
  - Brief synopsis
- Often organized in a **vertical timeline** or **horizontal scroll**
- Locked chapters show a **preview silhouette** with lock icon and unlock requirements
- Progress shown as "Chapter 3/10 completed"

**Episode selection in games (Game UI Database):**
- Grid layout with visual cards
- Difficulty indicators (stars)
- "In Progress" vs "Completed" vs "Locked" states
- Reward previews for uncompleted content

**Tokimeki Memorial approach:**
- Events unlock based on parameter thresholds
- Calendar-based progression (seasons matter)
- Special events appear with sparkle/glow effects

#### Recommended Design

```
┌─────────────────────────────────────────┐
│  Header: ← | ストーリー | 進捗 3/12    │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Intimacy Summary (glass cards)   │  │
│  │  [さや Lv.3 ♡♡♡]  [ゆめ Lv.2 ♡♡] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Filter: [All] [Saya] [Yume] [Duo]      │
│                                         │
│  ── Timeline View ──                    │
│                                         │
│  ┌──────────┐                           │
│  │ Ch.1     │  ✓ Completed              │
│  │ [thumb]  │  "出会いの日"              │
│  │ ⭐⭐⭐   │  Mission: 3/3             │
│  └──────────┘                           │
│       │ (connecting line)               │
│  ┌──────────┐                           │
│  │ Ch.2     │  ▶ In Progress            │
│  │ [thumb]  │  "放課後の秘密"            │
│  │ ⭐⭐⭐   │  Mission: 1/3             │
│  └──────────┘                           │
│       │                                 │
│  ┌──────────┐                           │
│  │ Ch.3     │  🔒 Locked                │
│  │ [blurred]│  Requires: Lv.3           │
│  │          │  "もう少し仲良くなったら"  │
│  └──────────┘                           │
│                                         │
│  ── Bottom Nav ──                       │
└─────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Layout**: Switch from a flat card list to a **visual timeline**:
   - Vertical line connecting story cards
   - Nodes on the line for each chapter (filled = completed, hollow = available, locked = grayed)
   - Cards alternate left/right for visual interest

2. **Story cards**: Each card should include:
   - **Thumbnail image** (character art relevant to the story) -- left side, 40% width
   - **Glass panel** with title, description, difficulty stars, and progress
   - **Status badge**: Completed (green checkmark + glow), In Progress (pulsing blue), Locked (lock icon + blur)
   - **Reward preview**: "Unlock: Special photo" or "Unlock: New greeting"

3. **Locked stories**: Show a **frosted glass blur** over the thumbnail with:
   - Lock icon (animated, subtle float)
   - Requirement text: "親密度 Lv.3 で解放" with a hint of what's inside
   - The card itself should have reduced opacity (0.5-0.6)

4. **Completed stories**: Show with:
   - Green accent border
   - Star rating (filled stars = missions completed)
   - "もう一度プレイ" (replay) button
   - Small confetti icon

5. **Mission progress within each story**: Show as small circles:
   - `●●○` (2/3 completed) with accent color fills

6. **Filter tabs**: Currently plain buttons. Make them **pill-shaped with active indicator**:
   - Active: Filled with character gradient
   - Inactive: Glass outline
   - Add small character icon next to filter label

#### Key CSS for Story Timeline

```css
/* Timeline connector */
.story-timeline {
  position: relative;
  padding-left: 2rem;
}
.story-timeline::before {
  content: '';
  position: absolute;
  left: 0.75rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom,
    rgba(255, 77, 141, 0.3),
    rgba(139, 92, 246, 0.3)
  );
}

/* Timeline node */
.timeline-node {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid;
  position: absolute;
  left: 0.25rem;
}
.timeline-node-completed {
  border-color: #10B981;
  background: #10B981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}
.timeline-node-active {
  border-color: #FF4D8D;
  background: transparent;
  animation: badge-pulse 2s ease-in-out infinite;
}
.timeline-node-locked {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}
```

---

### 4.5 Pricing Page

#### Research Findings

**How games present premium tiers:**
- **Never call it "pricing"** -- call it "Shop" or present it as unlocking abilities
- Use character art to show what you GET, not what you pay
- Show the transformation: "Free = distant relationship" vs "Premium = intimate relationship"
- Gacha games use **tiered visual escalation** (bronze/silver/gold card borders)
- Currency conversion obscures real cost (gems instead of dollars)

**Gacha game shop patterns (Game UI Database - Currency Store IAP):**
- Visual hierarchy: Best value pack is largest and most colorful
- "Popular" and "Best Value" badges drive selection
- Limited-time offers with countdown timers create urgency
- Each tier has a distinct visual theme (color, icon, border style)

**What makes pricing feel like "unlocking content" vs "paying for a service":**
- Show BEFORE/AFTER comparison (locked photo vs unlocked)
- Frame as "relationship upgrade" not "subscription"
- Use game language: "Level Up", "Unlock", "Power Up"
- Show exclusive content previews (blurred/teased)

#### Recommended Design

```
┌─────────────────────────────────────────┐
│  Header: ← | Upgrade Your Bond         │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Hero: Saya+Yume art             │  │
│  │  "もっと近づきたい？"             │  │
│  │  "2人だけの特別な時間を♡"         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Feature Comparison (visual) ──      │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ FREE    │ │ BASIC   │ │ PREMIUM │  │
│  │ ─────── │ │ ─────── │ │ ─────── │  │
│  │ [gray   │ │ [pink   │ │ [gold   │  │
│  │  border]│ │  border]│ │  border]│  │
│  │         │ │         │ │         │  │
│  │ 5 msgs  │ │ Unlim.  │ │ Unlim.  │  │
│  │ /day    │ │ msgs    │ │ msgs    │  │
│  │         │ │         │ │         │  │
│  │ Basic   │ │ 30 imgs │ │ Unlim.  │  │
│  │ chat    │ │ /month  │ │ imgs    │  │
│  │         │ │         │ │         │  │
│  │ ×       │ │ ✓       │ │ ✓       │  │
│  │ stories │ │ stories │ │ stories │  │
│  │         │ │         │ │         │  │
│  │ current │ │ ¥1,980  │ │ ¥2,980  │  │
│  │         │ │ /month  │ │ /month  │  │
│  │         │ │         │ │ ★推奨   │  │
│  │         │ │ [選ぶ]  │ │ [選ぶ]  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  ── What Premium Unlocks (preview) ──   │
│  ┌───────────────────────────────────┐  │
│  │  [blurred sexy photo] → [clear]  │  │
│  │  "こんな写真も送れるようになる♡"  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── FAQ / Guarantee ──                  │
│  "いつでもキャンセルOK"                 │
│  "3日間無料トライアル"                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Rename from "Pricing" to relationship-focused language**:
   - Page title: "もっと近づく" or "Level Up Your Bond"
   - Avoid clinical "プラン" language

2. **Tier card design** -- each tier should have a **distinct visual tier** (like gacha rarity):
   - **Free**: Plain glass panel, white/gray border, minimal
   - **Basic**: Pink glass panel, pink gradient border, subtle glow
   - **Premium**: Gold glass panel, animated gold border (shimmer), sparkle particles, "RECOMMENDED" badge with pulse animation
   - The Premium card should be **slightly larger** (105% scale) and **elevated** (more shadow)

3. **Feature presentation**: Instead of a text checklist, show **visual previews**:
   - Chat: Show a mock chat bubble with "unlimited" badge
   - Photos: Show a grid of photos (blurred for free, clear for premium)
   - Stories: Show story cards transitioning from locked to unlocked

4. **Call-to-action buttons**:
   - Free: No button (already active state)
   - Basic: `bg-gradient-to-r from-pink-600 to-pink-500` with subtle glow
   - Premium: `bg-gradient-to-r from-amber-500 to-yellow-500` with animated shimmer border and stronger glow

5. **"What you unlock" preview section**: Show a blurred/teased photo or chat excerpt that becomes clear, demonstrating the value visually

6. **Social proof**: Add "X人が選んでいます" counter on each tier

7. **Guarantee messaging**: Add a glassmorphism card at the bottom with reassuring text about cancellation

#### Key CSS for Pricing Cards

```css
/* Premium card with animated gold border */
.card-premium {
  position: relative;
  background: rgba(255, 215, 0, 0.03);
  border-radius: 1.5rem;
  overflow: hidden;
}
.card-premium::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 1.5rem;
  background: linear-gradient(
    135deg,
    #FFD700 0%,
    #FF8C00 25%,
    #FFD700 50%,
    #FFA500 75%,
    #FFD700 100%
  );
  background-size: 200% 200%;
  animation: shimmer 3s linear infinite;
  z-index: -1;
}
.card-premium::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: calc(1.5rem - 1px);
  background: #0f0f24;
  z-index: -1;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* "Popular" badge */
.badge-popular {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  font-weight: 700;
  font-size: 0.6875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  animation: badge-pulse 2s ease-in-out infinite;
}
```

---

### 4.6 Settings Page

#### Research Findings

**Game settings patterns:**
- Usually the LEAST visually decorated page -- clean, functional
- But still maintains the overall aesthetic (glass panels, accent colors)
- Organized in clear sections with icons
- Profile section at top with character avatar and stats summary
- Account management, notification preferences, display settings

**AI companion app settings:**
- Replika: Avatar customization, relationship type selection, memory management
- Kindroid: Character personality editing, voice settings
- Nomi: Backstory editing, appearance customization

#### Recommended Design

```
┌─────────────────────────────────────────┐
│  Header: ← | 設定                       │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Profile Card (glass panel)       │  │
│  │  [Avatar]  {Nickname}             │  │
│  │            Premium Member ⭐      │  │
│  │            "Member since 3/2026"  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Relationship Stats (glass) ──       │
│  さや Lv.3 ♡♡♡  |  ゆめ Lv.2 ♡♡       │
│  総メッセージ: 342  |  日: 14           │
│                                         │
│  ── Account ──                          │
│  [👤] ニックネーム変更                   │
│  [🔗] LINE連携                          │
│  [📧] メールアドレス                    │
│                                         │
│  ── Subscription ──                     │
│  [💎] 現在のプラン: Premium             │
│  [📅] 次回更新日: 2026-04-21           │
│  [⬆️] プラン変更                        │
│                                         │
│  ── Memory ──                           │
│  [🧠] さやとゆめの記憶を管理            │
│  [🗑️] 記憶をリセット                    │
│                                         │
│  ── Support ──                          │
│  [💬] サポートチャット                   │
│  [📋] 利用規約                          │
│  [🔒] プライバシーポリシー              │
│                                         │
│  ── Danger Zone ──                      │
│  [🚪] ログアウト                        │
│  [❌] アカウント削除                    │
│                                         │
│  ── Bottom Nav ──                       │
└─────────────────────────────────────────┘
```

#### Specific Changes from Current Design

1. **Profile card at top**: Currently no profile summary. Add a **glassmorphism card** showing:
   - User avatar (or initials circle with gradient)
   - Nickname
   - Plan badge (color-coded: gray=free, pink=basic, gold=premium)
   - Days since joining
   - Total messages exchanged

2. **Section grouping**: Use **glassmorphism section cards** instead of bare list items:
   - Each section has an icon, title, and optional subtitle
   - Tappable rows with `>` chevron
   - Subtle dividers between rows (1px, 5% white)

3. **Relationship stats mini-dashboard**: Add a small stats panel showing:
   - Intimacy levels with visual heart gauges
   - Days chatted / total messages / longest streak
   - This makes settings feel less boring and more "game-like"

4. **Memory management**: Style it as a **"Memory Album"** card collection:
   - Each memory shown as a small card with category icon
   - Swipe to delete
   - "What Saya remembers about you" / "What Yume remembers" sections

5. **Danger zone**: Visually separated with a red-tinted glassmorphism card:
   - `border-color: rgba(239, 68, 68, 0.15)`
   - Destructive actions clearly marked

---

## 5. Bottom Navigation

### Current Issue

The current bottom nav uses emoji icons (🏠 💬 📖 ⚙️) with plain text. This feels like a basic web app, not a game.

### Recommended Design

**Use SVG/icon font with these enhancements:**

1. **Icon style**: Outline icons when inactive, filled + glow when active
2. **Active indicator**: A **gradient dot or line** under the active tab (not just color change)
3. **Background**: `glass-panel` with stronger blur
4. **Badge notifications**: Small red dot with pulse animation for unread messages/new content
5. **Tab bar height**: Slightly taller (60px) with more padding for touch targets

```css
/* Bottom nav */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(6, 6, 18, 0.85);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Active tab indicator */
.nav-tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1.5rem;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, #FF4D8D, #8B5CF6);
}

/* Active icon glow */
.nav-icon-active {
  filter: drop-shadow(0 0 6px rgba(255, 77, 141, 0.4));
}
```

### Recommended Navigation Items

| Tab | Icon | Label | Notes |
|-----|------|-------|-------|
| Home | House (filled/outline) | ホーム | Default landing |
| Chat | Speech bubble | チャット | Badge for unread |
| Story | Book/play button | ストーリー | Badge for new unlocks |
| Settings | Gear/user | マイページ | Rename from 設定 to feel less technical |

---

## 6. Reference Apps & URLs

### Must-Study References

| App/Game | What to Study | URL |
|----------|--------------|-----|
| **Blue Archive** | Home screen idle behavior, MomoTalk chat, flat 2.0 style | [GameUI Lab Analysis](https://uidesign.chodoiilife.com/blue-arc-things/) |
| **Gakuen IdolMaster** | Glassmorphism text boxes, vivid CTAs, icon layout | [UI Design Analysis (note.com)](https://note.com/col_loc/n/n4d5dc52d92c7) |
| **Genshin Impact** | Semi-transparent UI, world immersion | [GameUI Lab](https://uidesign.chodoiilife.com/genshin-things/) |
| **Honkai: Star Rail** | Transition animations, pop-up hierarchy | [Note.com Analysis](https://note.com/opvel/n/n2ecf011636cd) |
| **Replika** | 3D avatar room, onboarding quiz, mood tracking | [ScreensDesign](https://screensdesign.com/showcase/replika-ai-friend) |
| **Kindroid** | Expression display in chat, clean UI | [ScreensDesign](https://screensdesign.com/showcase/kindroid) |
| **Game UI Database** | 55,000+ screenshots across 1,300+ games | [gameuidatabase.com](https://www.gameuidatabase.com/) |
| **Visual Novel UI Tumblr** | Curated VN interface designs | [vnui.tumblr.com](https://www.tumblr.com/vnui) |

### CSS & Component Resources

| Resource | What | URL |
|----------|------|-----|
| **Glass UI Generator** | Glassmorphism CSS generator | [ui.glass](https://ui.glass/generator) |
| **Aceternity UI Sparkles** | React sparkle component | [ui.aceternity.com](https://ui.aceternity.com/components/sparkles) |
| **Hypercolor Gradients** | Tailwind gradient presets | [hypercolor.dev](https://hypercolor.dev/) |
| **Dark Glassmorphism Guide** | 2026 dark glass UI trend | [Medium Article](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f) |

### Design Pattern Databases

| Resource | URL |
|----------|-----|
| Game UI Database - Currency Store (IAP) | [gameuidatabase.com/index.php?scrn=122](https://www.gameuidatabase.com/index.php?scrn=122) |
| Game UI Database - Stage/Level Select | [gameuidatabase.com/index.php?scrn=42](https://gameuidatabase.com/index.php?scrn=42&set=1&tag=62,72,15) |
| Dribbble Gacha UI | [dribbble.com/tags/gacha](https://dribbble.com/tags/gacha) |
| Dating Sim UI Pack | [itch.io](https://loudeyes.itch.io/dating-sim-ui-pack) |

---

## Summary: Top 10 Highest-Impact Changes

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | **Glassmorphism everywhere** -- replace solid backgrounds with glass panels | Instant premium feel | Medium |
| 2 | **Character cards on home** -- large visual cards with portrait + EXP bar | Game feel | Medium |
| 3 | **Chat bubble redesign** -- glass AI bubbles + gradient user bubbles | Emotional feel | Low |
| 4 | **Animated gold pricing card** -- shimmer border on Premium tier | Conversion lift | Low |
| 5 | **SVG bottom nav** -- replace emoji with proper icons + active indicators | Polish | Low |
| 6 | **Login full-bleed character art** -- game title screen feel on mobile | First impression | Medium |
| 7 | **Story timeline layout** -- visual progression with connecting line | Game feel | High |
| 8 | **Ambient glow behind characters** -- radial gradient + pulse animation | Immersion | Low |
| 9 | **Micro-interactions** -- button press scale, card hover float, sparkles | Game feel | Medium |
| 10 | **Idle timeout on home** -- fade UI, show just character (Blue Archive) | Unique touch | Low |
