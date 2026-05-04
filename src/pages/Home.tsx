import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Gamepad2,
  ChevronRight,
  X,
  ScrollText,
  Settings,
  Layers,
} from 'lucide-react';
import { CHANGELOG, GAME_VERSION, formatFullChangelogText } from '../data/changelog';

export default function Home() {
  const navigate = useNavigate();
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#07060d] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(124, 58, 237, 0.35), transparent 50%), radial-gradient(ellipse 80% 50% at 100% 50%, rgba(236, 72, 153, 0.12), transparent 45%), radial-gradient(ellipse 60% 40% at 0% 80%, rgba(34, 211, 238, 0.08), transparent 40%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2032%2032%22%20width=%2232%22%20height=%2232%22%20fill=%22none%22%20stroke=%22rgba(255,255,255,0.03)%22%3E%3Cpath%20d=%22M0%20.5H31.5V32%22/%3E%3C/svg%3E')] opacity-60" />

      <header className="relative z-10 max-w-5xl mx-auto px-5 pt-10 pb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/50 flex items-center justify-center ring-1 ring-white/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-300/90 font-medium">AI Sim Life</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
              AI 模拟人生
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
            aria-label="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <span className="hidden sm:inline text-xs text-zinc-500 tabular-nums px-2 py-1 rounded-lg bg-white/5 border border-white/5">
            v{GAME_VERSION}
          </span>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-5 pb-32 space-y-10">
        <section className="text-center sm:text-left space-y-4">
          <p className="text-zinc-400 text-lg max-w-2xl sm:mx-0 mx-auto leading-relaxed">
            一款由大语言模型驱动的纯文本人生模拟：你自定义身份与性格，在修真或校园主题的世界中书写独一无二的剧情。
            每一轮对话都会改变世界状态，存档会完整保留你的叙事轨迹。
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-violet-300 mb-3">
              <BookOpen className="w-5 h-5" />
              <h2 className="font-semibold text-white">这是什么</h2>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              「AI 模拟人生」把传统数值人生与开放叙事结合：没有固定关卡，由 AI 根据你的行动生成场景、NPC
              与后果。当前开放「修真玄幻」主题；学院主题陆续推出中。
            </p>
          </div>
          <div className="rounded-2xl p-6 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-fuchsia-300 mb-3">
              <Gamepad2 className="w-5 h-5" />
              <h2 className="font-semibold text-white">怎么玩</h2>
            </div>
            <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li>在存档页选择三个槽位之一，开始新档或读取旧档。</li>
              <li>配置 API 后选择世界主题，创建角色并进入对局。</li>
              <li>用自然语言描述行动；可随时保存，系统也会按槽位自动保存进度。</li>
            </ol>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/saves')}
            className="group relative flex-1 overflow-hidden rounded-2xl px-8 py-5 text-left bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-semibold text-lg shadow-xl shadow-violet-950/40 ring-1 ring-white/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <span className="relative flex items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 shrink-0 opacity-90" />
                点击开启你的模拟人生
              </span>
              <ChevronRight className="w-6 h-6 shrink-0 opacity-80 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setShowChangelog(true)}
        className="fixed bottom-6 right-5 z-20 flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-zinc-900/90 border border-violet-500/30 text-sm text-violet-200 shadow-2xl shadow-black/40 backdrop-blur-md hover:border-violet-400/50 hover:bg-zinc-800/95 transition-colors"
      >
        <ScrollText className="w-4 h-4 text-fuchsia-400" />
        <span>版本更新</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/40 text-violet-100 tabular-nums">v{CHANGELOG[0]?.version}</span>
      </button>

      {showChangelog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
        >
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[#12101c] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h2 id="changelog-title" className="text-lg font-semibold text-white flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-violet-400" />
                游戏更新记录
              </h2>
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {CHANGELOG.map((entry) => (
                <article key={entry.version} className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-violet-400 font-mono text-sm">v{entry.version}</span>
                    <span className="text-zinc-500 text-xs">{entry.date}</span>
                  </div>
                  <h3 className="text-white font-medium">{entry.title}</h3>
                  <ul className="text-sm text-zinc-400 space-y-1.5 list-disc list-inside leading-relaxed">
                    {entry.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-black/20 shrink-0">
              <p className="text-xs text-zinc-500 leading-relaxed">
                完整纯文本可复制：
              </p>
              <pre className="mt-2 text-[11px] text-zinc-500 whitespace-pre-wrap break-words max-h-24 overflow-y-auto rounded-lg bg-black/30 p-2 border border-white/5">
                {formatFullChangelogText()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
