import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { SaveData } from '../types/game';
import {
  loadSaveSlots,
  writeSaveSlots,
  SAVE_SLOT_COUNT,
  setSlot,
} from '../utils/saveSlots';
import { persistGameToSlot } from '../utils/persistGameToSlot';
import {
  Save,
  ArrowLeft,
  Swords,
  Clock,
  MapPin,
  User,
  Sparkles,
  BookOpen,
  Trash2,
  X,
} from 'lucide-react';

type SlotModal =
  | null
  | {
      kind: 'occupied';
      slotIndex: number;
      save: SaveData;
    };

export default function SaveLoad() {
  const navigate = useNavigate();
  const theme = useGameStore((state) => state.theme);
  const character = useGameStore((state) => state.character);
  const loadSave = useGameStore((state) => state.loadSave);
  const endGame = useGameStore((state) => state.endGame);
  const setActiveSaveSlot = useGameStore((state) => state.setActiveSaveSlot);

  const [slots, setSlots] = useState<(SaveData | null)[]>([null, null, null]);
  const [slotModal, setSlotModal] = useState<SlotModal>(null);
  const [confirmClear, setConfirmClear] = useState<number | null>(null);

  useEffect(() => {
    setSlots(loadSaveSlots());
  }, []);

  const hasActiveGame = Boolean(theme && character);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const refreshSlots = () => setSlots(loadSaveSlots());

  /** 空槽：结束当前会话并前往主题选择，绑定槽位供后续自动保存 */
  const beginNewLifeInSlot = (slotIndex: number) => {
    endGame();
    setActiveSaveSlot(slotIndex);
    navigate('/theme');
  };

  const handleSlotCardClick = (slotIndex: number) => {
    const save = slots[slotIndex];
    if (save) {
      setSlotModal({ kind: 'occupied', slotIndex, save });
      return;
    }
    beginNewLifeInSlot(slotIndex);
  };

  const handleLoadFromModal = () => {
    if (!slotModal || slotModal.kind !== 'occupied') return;
    loadSave(slotModal.save);
    setActiveSaveSlot(slotModal.slotIndex);
    setSlotModal(null);
    navigate('/game');
  };

  const handleOverwriteFromModal = () => {
    if (!slotModal || slotModal.kind !== 'occupied') return;
    const idx = slotModal.slotIndex;
    setSlotModal(null);
    const cleared = setSlot(loadSaveSlots(), idx, null);
    writeSaveSlots(cleared);
    setSlots(cleared);
    beginNewLifeInSlot(idx);
  };

  const handleQuickSaveToSlot = (slotIndex: number) => {
    if (!hasActiveGame) return;
    if (!persistGameToSlot(slotIndex)) return;
    refreshSlots();
  };

  const handleClearSlot = (slotIndex: number) => {
    if (confirmClear === slotIndex) {
      const next = setSlot(slots, slotIndex, null);
      writeSaveSlots(next);
      setSlots(next);
      setConfirmClear(null);
    } else {
      setConfirmClear(slotIndex);
      window.setTimeout(() => setConfirmClear(null), 2800);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06050a] flex items-center justify-center p-4 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(124, 58, 237, 0.28), transparent 50%), radial-gradient(ellipse 45% 35% at 0% 100%, rgba(34, 211, 238, 0.08), transparent 40%)',
        }}
      />

      <div className="max-w-5xl w-full relative z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </button>

        <div className="rounded-3xl p-6 sm:p-10 bg-white/[0.035] border border-white/[0.08] backdrop-blur-xl shadow-2xl shadow-black/40 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 border border-white/10 flex items-center justify-center shrink-0">
              <Save className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">选择存档位</h1>
              <p className="text-zinc-400 mt-1 text-sm leading-relaxed">
                点击任意卡片开启一段人生：空槽将开始新档并绑定该槽；已有存档时可读取或选择覆盖后重开。
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 sm:justify-end">
              <BookOpen className="w-4 h-4 text-violet-400" />
              三槽本地存储
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: SAVE_SLOT_COUNT }, (_, slotIndex) => {
              const save = slots[slotIndex];
              const isClearPending = confirmClear === slotIndex;
              return (
                <div
                  key={slotIndex}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSlotCardClick(slotIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSlotCardClick(slotIndex);
                    }
                  }}
                  className={`group text-left rounded-2xl border p-5 min-h-[240px] flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/80 ${
                    save
                      ? 'border-white/12 bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:border-violet-400/35'
                      : 'border-dashed border-white/15 bg-white/[0.02] hover:border-cyan-400/30 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
                      槽位 {slotIndex + 1}
                    </span>
                    {!save ? (
                      <Sparkles className="w-4 h-4 text-cyan-400/80 opacity-80 group-hover:opacity-100" />
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                        有存档
                      </span>
                    )}
                  </div>

                  {!save ? (
                    <>
                      <p className="text-zinc-500 text-sm flex-1 leading-relaxed">
                        空白旅程。点击在此槽开始<span className="text-zinc-300">新的人生</span>：将先选择世界主题并创建角色。
                      </p>
                      <p className="mt-4 text-xs text-violet-300/80 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        点击卡片继续
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-white font-semibold truncate mb-2 text-base" title={save.name}>
                        {save.name}
                      </h3>
                      <div className="space-y-1.5 text-xs text-zinc-400 flex-1 mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                          <span className="truncate">{save.character.name}</span>
                        </div>
                        {save.playerState.cultivationLevel && (
                          <div className="flex items-center gap-1.5 text-cyan-400/90">
                            <Swords className="w-3.5 h-3.5 shrink-0" />
                            {save.playerState.cultivationLevel}
                          </div>
                        )}
                        {save.currentScene && (
                          <div className="flex items-center gap-1.5 text-violet-300/90">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{save.currentScene.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(save.timestamp)}
                        </div>
                      </div>
                      <p className="text-xs text-violet-300/80">点击选择读取或覆盖</p>
                    </>
                  )}

                  <div
                    className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {hasActiveGame && (
                      <button
                        type="button"
                        onClick={() => handleQuickSaveToSlot(slotIndex)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/25 text-violet-200 text-xs"
                      >
                        <Save className="w-3 h-3" />
                        将当前进度写入此槽
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleClearSlot(slotIndex)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        isClearPending
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-300'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {isClearPending ? '再点确认清空' : '清空'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          对局内亦可通过顶栏保存；若已绑定槽位，对话与状态会定期自动写入该槽。
        </p>
      </div>

      {slotModal?.kind === 'occupied' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#12101c] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">存档槽 {slotModal.slotIndex + 1}</h2>
              <button
                type="button"
                onClick={() => setSlotModal(null)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-zinc-400">
                该槽已有进度，请选择：
              </p>
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-2">
                <p className="text-white font-medium truncate">{slotModal.save.name}</p>
                <p className="text-xs text-zinc-500">
                  {slotModal.save.character.name} · {formatDate(slotModal.save.timestamp)}
                </p>
              </div>
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLoadFromModal}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:opacity-95 transition-opacity"
              >
                读取该存档
              </button>
              <button
                type="button"
                onClick={handleOverwriteFromModal}
                className="w-full py-3 rounded-xl bg-white/10 border border-amber-500/30 text-amber-200 font-medium text-sm hover:bg-white/[0.08] transition-colors"
              >
                新开游戏并覆盖此槽
              </button>
              <button
                type="button"
                onClick={() => setSlotModal(null)}
                className="w-full py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
