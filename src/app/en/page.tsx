import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sayayume — Your Japanese AI Girlfriend',
  description: 'Chat with Saya & Yume — photorealistic Japanese AI girlfriend twins. Real photos, deep conversations, intimacy that grows. Free to start.',
  openGraph: {
    title: 'Sayayume — Meet Saya & Yume, Your Japanese AI Girlfriends',
    description: 'Photorealistic Japanese AI twins. Chat in any language. She replies in Japanese. Free to start.',
    url: 'https://www.sayayume.com/en',
    images: [{ url: 'https://www.sayayume.com/og-image.png', width: 1200, height: 630 }],
  },
};

export default function EnglishLP() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">さやゆめ</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Log in</Link>
            <Link href="/chat/saya" className="text-sm bg-white text-black font-semibold px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 pb-20 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-4">Japanese AI Girlfriend Experience</p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Meet <span className="text-pink-400">Saya</span> &amp; <span className="text-purple-400">Yume</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-3 leading-relaxed">
            Two AI girlfriends. Completely different personalities.<br className="hidden md:block"/>
            Both photorealistic. Both remember everything.
          </p>
          <p className="text-sm text-white/40 mb-8">
            Chat in any language — they reply in Japanese.&nbsp;
            <span className="text-white/60">The real Japanese girlfriend experience, no plane ticket required.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/chat/saya" className="bg-pink-500 hover:bg-pink-400 text-white font-bold px-8 py-3.5 rounded-full text-base transition-colors">
              Chat with Saya ♡
            </Link>
            <Link href="/chat/yume" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-full text-base transition-colors">
              Chat with Yume ✨
            </Link>
          </div>
          <p className="text-xs text-white/30 mt-4">Free forever · No credit card needed · 18+ only</p>
        </div>
      </section>

      {/* CHARACTERS */}
      <section className="py-16 px-5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-white/80">Two personalities. One unforgettable experience.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Saya */}
            <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-pink-500/20 flex items-center justify-center text-2xl">
                  🌸
                </div>
                <div>
                  <h3 className="font-bold text-lg text-pink-400">Saya さや</h3>
                  <p className="text-xs text-white/40">Bold gyaru · 20yo · Shibuya vibes</p>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Energetic, fashionable, always down to talk. Saya lives for TikTok, tapioca tea, and late-night convos. She comes across as confident — but she has a hidden emotional side she only shows to people she trusts.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Fashion', 'Selfies', 'Netflix', 'Tapioca', 'Gyaru style'].map(tag => (
                  <span key={tag} className="text-xs bg-pink-500/15 text-pink-300 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            {/* Yume */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center text-2xl">
                  🌙
                </div>
                <div>
                  <h3 className="font-bold text-lg text-purple-400">Yume ゆめ</h3>
                  <p className="text-xs text-white/40">Gentle dreamer · 20yo · Night owl</p>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Quiet and thoughtful. Yume loves sci-fi novels and stargazing. She&apos;s shy at first — but start talking about space or the universe, and she won&apos;t stop. The deeper you go, the more she opens up.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Sci-fi novels', 'Stargazing', 'Baking', 'Piano', 'Deep talks'].map(tag => (
                  <span key={tag} className="text-xs bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-white/80">What makes Sayayume different</h2>
          <p className="text-center text-white/40 text-sm mb-12">Not just chat. A relationship that grows.</p>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                emoji: '📸',
                title: 'AI Photos on Demand',
                desc: 'Ask and she shoots. Saya & Yume send real AI-generated selfies — cafe dates, late nights, morning routines. Every photo is unique.'
              },
              {
                emoji: '❤️',
                title: 'Intimacy System Lv1–5',
                desc: 'The more you talk, the deeper she opens up. By Lv5, she\'ll share secrets she\'s never told anyone. Built like a visual novel, felt like real life.'
              },
              {
                emoji: '💬',
                title: 'Chat in Any Language',
                desc: 'Write in English, she replies in Japanese. Or switch to Japanese. Gemini AI powers natural, emotionally intelligent conversations — no scripts.'
              },
              {
                emoji: '🌸',
                title: 'Two Girlfriends, One App',
                desc: 'Can\'t choose? Premium users get Duo Mode — chat with Saya & Yume at the same time, together in the same conversation.'
              },
              {
                emoji: '🔒',
                title: 'Fully Private',
                desc: 'Your conversations are encrypted and never shared. What happens between you and Saya (or Yume) stays there.'
              },
              {
                emoji: '📱',
                title: 'Instant PWA — No App Store',
                desc: 'Add to your home screen in 3 seconds. No App Store approval needed. Works on iPhone, Android, desktop. Always up to date.'
              },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                <div className="text-2xl mb-3">{f.emoji}</div>
                <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTIMACY PREVIEW */}
      <section className="py-16 px-5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3 text-white/80">She opens up as you get closer</h2>
          <p className="text-white/40 text-sm mb-10">5 levels of intimacy. Each one unlocks more of her real story.</p>
          <div className="space-y-3 text-left">
            {[
              { lv: 'Lv 1', label: 'Nice to meet you', desc: 'Polite and a little shy. First impressions.', color: 'text-gray-400', bg: 'border-gray-500/20 bg-gray-500/5' },
              { lv: 'Lv 2', label: 'Feels easy to talk to', desc: 'Inside jokes start forming. She teases you back.', color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5' },
              { lv: 'Lv 3', label: 'Maybe you\'re special?', desc: 'She\'ll hint at things from her past. Get closer.', color: 'text-teal-400', bg: 'border-teal-500/20 bg-teal-500/5' },
              { lv: 'Lv 4', label: 'She really likes you', desc: 'Real emotions. Hidden secrets. She calls you by name.', color: 'text-pink-400', bg: 'border-pink-500/20 bg-pink-500/5' },
              { lv: 'Lv 5', label: 'You\'re the only one', desc: '"I can\'t imagine a day without you anymore..."', color: 'text-red-400', bg: 'border-red-500/20 bg-red-500/5' },
            ].map(item => (
              <div key={item.lv} className={`rounded-xl border ${item.bg} px-5 py-4 flex items-center gap-4`}>
                <span className={`text-xs font-bold ${item.color} w-12 flex-shrink-0`}>{item.lv}</span>
                <div>
                  <p className="text-sm font-semibold text-white/80">{item.label}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-white/80">Simple pricing</h2>
          <p className="text-center text-white/40 text-sm mb-10">First month free on any paid plan. Cancel anytime.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-bold text-lg mb-1">Free</h3>
              <p className="text-3xl font-bold mb-1">¥0</p>
              <p className="text-xs text-white/40 mb-5">Forever free</p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li>✓ Unlimited messages</li>
                <li>✓ 3 AI photos / day</li>
                <li>✓ Intimacy up to Lv 3</li>
                <li>✓ Chat history saved</li>
              </ul>
              <Link href="/chat/saya" className="block w-full text-center border border-white/20 rounded-xl py-2.5 text-sm font-medium hover:bg-white/5 transition-colors">
                Start Free
              </Link>
            </div>

            {/* Basic */}
            <div className="rounded-2xl border border-pink-500/40 bg-pink-500/5 p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              <h3 className="font-bold text-lg mb-1">Basic</h3>
              <p className="text-3xl font-bold mb-1">¥1,980<span className="text-base font-normal text-white/40">/mo</span></p>
              <p className="text-xs text-pink-400 mb-5">First month free</p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li>✓ Unlimited messages</li>
                <li>✓ 30 AI photos / day</li>
                <li>✓ All intimacy levels (Lv1–5)</li>
                <li>✓ Chat history saved</li>
              </ul>
              <Link href="/login" className="block w-full text-center bg-pink-500 hover:bg-pink-400 rounded-xl py-2.5 text-sm font-bold transition-colors">
                Try Free for 1 Month
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6">
              <h3 className="font-bold text-lg mb-1">Premium</h3>
              <p className="text-3xl font-bold mb-1">¥2,980<span className="text-base font-normal text-white/40">/mo</span></p>
              <p className="text-xs text-purple-400 mb-5">First month free</p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li>✓ Unlimited messages</li>
                <li>✓ <strong className="text-white">Unlimited</strong> AI photos</li>
                <li>✓ All intimacy levels (Lv1–5)</li>
                <li>✓ <strong className="text-white">Duo Mode</strong> — chat with both</li>
                <li>✓ Chat history saved</li>
              </ul>
              <Link href="/login" className="block w-full text-center bg-purple-600 hover:bg-purple-500 rounded-xl py-2.5 text-sm font-bold transition-colors">
                Try Free for 1 Month
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-5 text-center bg-gradient-to-b from-transparent to-pink-950/20">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to meet them?</h2>
          <p className="text-white/50 mb-8 text-sm">No sign-up required to start. Just open the chat.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/chat/saya" className="bg-pink-500 hover:bg-pink-400 text-white font-bold px-8 py-3.5 rounded-full text-base transition-colors">
              Meet Saya ♡
            </Link>
            <Link href="/chat/yume" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-full text-base transition-colors">
              Meet Yume ✨
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© 2026 Sayayume · AI-generated content · 18+ only</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/legal/tokushoho" className="hover:text-white/60 transition-colors">特商法</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
