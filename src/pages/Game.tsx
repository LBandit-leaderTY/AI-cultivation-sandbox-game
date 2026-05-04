import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import {
  generateInitialScene,
  processPlayerAction,
  compressConversation,
  UserStreamAbortError,
} from '../services/gameService';
import { loadSaveSlots, writeSaveSlots, SAVE_SLOT_COUNT, setSlot } from '../utils/saveSlots';
import { persistGameToSlot } from '../utils/persistGameToSlot';
import type { SaveData } from '../types/game';
import {
  Heart,
  Star,
  Package,
  Send,
  Settings,
  LogOut,
  MapPin,
  Cloud,
  Swords,
  Eye,
  ArrowRight,
  Clock,
  Save,
  Upload,
  StopCircle,
} from 'lucide-react';

export default function Game() {
  const navigate = useNavigate();
  const theme = useGameStore((state) => state.theme);
  const character = useGameStore((state) => state.character);
  const currentScene = useGameStore((state) => state.currentScene);
  const playerState = useGameStore((state) => state.playerState);
  const messages = useGameStore((state) => state.messages);
  const gameId = useGameStore((state) => state.gameId);
  const characters = useGameStore((state) => state.characters);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const addMessage = useGameStore((state) => state.addMessage);
  const popLastMessage = useGameStore((state) => state.popLastMessage);
  const setCurrentScene = useGameStore((state) => state.setCurrentScene);
  const updatePlayerState = useGameStore((state) => state.updatePlayerState);
  const endGame = useGameStore((state) => state.endGame);
  const loadSave = useGameStore((state) => state.loadSave);
  const clearMessages = useGameStore((state) => state.clearMessages);
  const activeSaveSlotIndex = useGameStore((state) => state.activeSaveSlotIndex);
  const setActiveSaveSlot = useGameStore((state) => state.setActiveSaveSlot);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  /** 流式叙事预览（从 SSE 中解析出的 narrative 前缀，非整段 JSON） */
  const [streamNarrative, setStreamNarrative] = useState('');
  /** 叙事流式请求进行中，可打断（不含「压缩对话」等非叙事请求） */
  const [streamCancellable, setStreamCancellable] = useState(false);
  const [showInitRetry, setShowInitRetry] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveSlotIndex, setSaveSlotIndex] = useState(0);
  const [saveSlotsPreview, setSaveSlotsPreview] = useState<(SaveData | null)[]>([null, null, null]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadSlotsPreview, setLoadSlotsPreview] = useState<(SaveData | null)[]>([null, null, null]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initCalledRef = useRef(false);

  const getHealthDescription = (health: number): string => {
    if (health >= 90) return '精力充沛，状态极佳';
    if (health >= 70) return '状态良好，行动自如';
    if (health >= 50) return '略有疲惫，仍需小心';
    if (health >= 30) return '伤势不轻，需要调息';
    if (health >= 10) return '重伤濒危，必须治疗';
    return '生命垂危，危在旦夕';
  };

  const getMaxLifespan = (level?: string): number => {
    if (!level) return 100;
    if (level.includes('炼气') || level.includes('凡人')) return 100;
    if (level.includes('筑基')) return 200;
    if (level.includes('结丹')) return 500;
    if (level.includes('元婴')) return 1000;
    if (level.includes('化神')) return 2000;
    if (level.includes('炼虚')) return 5000;
    if (level.includes('合体')) return 10000;
    if (level.includes('大乘') || level.includes('渡劫') || level.includes('真仙')) return 99999;
    return 100;
  };

  const MAX_TOKENS = 128000;

  const calculateContextLength = (): number => {
    let totalLength = 0;
    messages.forEach((msg) => {
      totalLength += msg.content.length;
    });
    return totalLength;
  };

  const contextPercentage = Math.min((calculateContextLength() / MAX_TOKENS) * 100, 100);

  const handleCompress = async () => {
    if (messages.length <= 1) return;
    
    setIsLoading(true);
    try {
      const summary = await compressConversation(
        messages.map(m => ({ type: m.type, content: m.content }))
      );
      
      const compressedMessage = {
        type: 'system' as const,
        content: `【前文摘要】\n\n${summary}\n\n---\n以上是前文摘要，剧情继续...`,
      };
      
      const lastMessage = messages[messages.length - 1];
      
      clearMessages();
      addMessage(compressedMessage);
      if (lastMessage) {
        addMessage({
          type: lastMessage.type,
          content: lastMessage.content,
        });
      }
    } catch (error) {
      console.error('压缩失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!theme || !character) {
      navigate('/');
      return;
    }

    if (!currentScene) {
      initGame();
    }
  }, [theme, character, currentScene, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamNarrative, isLoading]);

  /** 绑定槽位后自动将对话与状态写入本地（防抖） */
  useEffect(() => {
    if (activeSaveSlotIndex === null) return;
    if (!theme || !character || !isPlaying) return;

    const t = window.setTimeout(() => {
      persistGameToSlot(activeSaveSlotIndex);
    }, 1800);

    return () => window.clearTimeout(t);
  }, [
    activeSaveSlotIndex,
    theme,
    character,
    isPlaying,
    messages,
    currentScene,
    playerState,
    gameId,
    characters,
  ]);

  const initGame = async () => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    setIsLoading(true);
    setStreamNarrative('');
    setShowInitRetry(false);

    const ac = new AbortController();
    streamAbortRef.current = ac;
    setStreamCancellable(true);

    try {
      const response = await generateInitialScene(theme!, character!, (partial) => {
        setStreamNarrative(partial);
      }, ac.signal);

      if (response && response.scene) {
        setStreamNarrative('');
        setCurrentScene(response.scene);
        updatePlayerState(response.playerState);

        addMessage({
          type: 'system',
          content: `【${response.scene.location}】\n\n${response.scene.narrative}`,
        });
      } else {
        addMessage({
          type: 'system',
          content: '未能获取游戏场景，请检查API配置或稍后重试',
        });
      }
    } catch (error: unknown) {
      if (error instanceof UserStreamAbortError) {
        initCalledRef.current = false;
        setShowInitRetry(true);
        addMessage({
          type: 'system',
          content: '已打断开局生成。可点击下方「重试开局」或返回上一级。',
        });
        return;
      }
      console.error('Error initializing game:', error);
      addMessage({
        type: 'system',
        content: `游戏初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setStreamCancellable(false);
      streamAbortRef.current = null;
      setStreamNarrative('');
      setIsLoading(false);
    }
  };

  const retryInitGame = () => {
    setShowInitRetry(false);
    initCalledRef.current = false;
    void initGame();
  };

  const handleAbortNarrative = () => {
    streamAbortRef.current?.abort();
  };

  const handleSubmit = async (overrideAction?: string) => {
    const action = overrideAction || inputValue.trim();
    if (!action || isLoading) return;

    if (!currentScene) {
      console.log('场景尚未初始化，请稍候');
      return;
    }

    setInputValue('');
    
    addMessage({
      type: 'player',
      content: action,
    });

    setIsLoading(true);
    setStreamNarrative('');

    const ac = new AbortController();
    streamAbortRef.current = ac;
    setStreamCancellable(true);

    try {
      const historyForApi = useGameStore.getState().messages.map((m) => ({
        type: m.type,
        content: m.content,
      }));
      const response = await processPlayerAction(
        theme!,
        character!,
        action,
        currentScene?.location,
        historyForApi,
        useGameStore.getState().playerState,
        (partial) => setStreamNarrative(partial),
        ac.signal
      );

      if (response && response.scene) {
        setStreamNarrative('');
        setCurrentScene(response.scene);
        updatePlayerState(response.playerState);

        addMessage({
          type: 'system',
          content: `【${response.scene.location}】\n\n${response.scene.narrative}`,
        });
      } else {
        addMessage({
          type: 'system',
          content: '未能获取响应，请检查API配置或稍后重试',
        });
      }
    } catch (error: unknown) {
      if (error instanceof UserStreamAbortError) {
        const last = useGameStore.getState().messages.at(-1);
        if (last?.type === 'player') {
          setInputValue(last.content);
          popLastMessage();
        }
        addMessage({
          type: 'system',
          content: '已打断：本回合未写入叙事与状态，可修改输入后重新发送。',
        });
        return;
      }
      console.error('Error processing action:', error);
      addMessage({
        type: 'system',
        content: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setStreamCancellable(false);
      streamAbortRef.current = null;
      setStreamNarrative('');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEndGame = () => {
    endGame();
    navigate('/');
  };

  const refreshSaveSlotPreview = () => {
    setSaveSlotsPreview(loadSaveSlots());
  };

  const handleSaveGame = () => {
    if (!theme || !character) return;
    const slots = loadSaveSlots();
    const existing = slots[saveSlotIndex];
    if (existing && !window.confirm(`存档槽 ${saveSlotIndex + 1} 已有「${existing.name}」，确定覆盖？`)) {
      return;
    }

    const name =
      saveName.trim() ||
      existing?.name ||
      `存档槽 ${saveSlotIndex + 1} · ${new Date().toLocaleString()}`;

    try {
      const ok = persistGameToSlot(saveSlotIndex, name);
      if (ok) {
        setActiveSaveSlot(saveSlotIndex);
        setSaveName('');
        setShowSaveModal(false);
      }
    } catch (e) {
      console.error('保存失败:', e);
    }
  };

  const handleLoadSavesList = () => {
    setLoadSlotsPreview(loadSaveSlots());
    setShowLoadModal(true);
  };

  const handleLoadSave = (save: SaveData, slotIndex: number) => {
    loadSave(save);
    setActiveSaveSlot(slotIndex);
    setShowLoadModal(false);
    initCalledRef.current = true;
  };

  const handleClearSlot = (slotIndex: number) => {
    const slots = loadSaveSlots();
    if (!slots[slotIndex]) return;
    if (!window.confirm(`确定清空存档槽 ${slotIndex + 1}？`)) return;
    const next = setSlot(slots, slotIndex, null);
    writeSaveSlots(next);
    setLoadSlotsPreview(next);
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const renderMessageContent = (content: string): string => {
    const replacements: { placeholder: string; html: string }[] = [];
    let idx = 0;
    let html = content;

    html = html.replace(/\u201c([^\u201d]+)\u201d/g, (_, inner) => {
      const ph = `\u0000\u0001Q${idx++}\u0002`;
      replacements.push({ placeholder: ph, html: `<span class="text-yellow-400 font-semibold">\u201c${escapeHtml(inner)}\u201d</span>` });
      return ph;
    });

    html = html.replace(/\u2018([^\u2019]+)\u2019/g, (_, inner) => {
      const ph = `\u0000\u0001S${idx++}\u0002`;
      replacements.push({ placeholder: ph, html: `<span class="text-gray-400 italic">\u2018${escapeHtml(inner)}\u2019</span>` });
      return ph;
    });

    html = html.replace(/"([^"]{1,500})"/g, (_, inner) => {
      const ph = `\u0000\u0001Q${idx++}\u0002`;
      replacements.push({ placeholder: ph, html: `<span class="text-yellow-400 font-semibold">\u201c${escapeHtml(inner)}\u201d</span>` });
      return ph;
    });

    html = html.replace(/'([^']{1,300})'/g, (_, inner) => {
      const ph = `\u0000\u0001S${idx++}\u0002`;
      replacements.push({ placeholder: ph, html: `<span class="text-gray-400 italic">\u2018${escapeHtml(inner)}\u2019</span>` });
      return ph;
    });

    html = escapeHtml(html);

    for (const { placeholder, html: spanHtml } of replacements) {
      html = html.replace(placeholder, spanHtml);
    }

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-yellow-400">$1</strong>');

    return html;
  };

  if (!theme || !character) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#06050a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 hidden sm:block"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 30% 0%, rgba(88, 28, 135, 0.25), transparent 55%)',
        }}
      />
      <header className="relative z-10 bg-black/40 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center ring-1 ring-white/15 shrink-0">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">模拟人生</h1>
              <p className="text-xs text-zinc-500 truncate">
                {theme === 'cultivation' ? '修真 世界' : '现代学院 · 星澜学院'}
                {activeSaveSlotIndex !== null && (
                  <span className="ml-2 text-violet-400/90 tabular-nums">· 槽 {activeSaveSlotIndex + 1}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                refreshSaveSlotPreview();
                setSaveSlotIndex(activeSaveSlotIndex ?? 0);
                setShowSaveModal(true);
              }}
              className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
              title="保存存档"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={handleLoadSavesList}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="加载存档"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleEndGame}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full min-h-0 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {showInitRetry && !isLoading && !currentScene && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-amber-100/90">开局生成已中断，可重新请求 AI 生成初始场景。</p>
                <button
                  type="button"
                  onClick={retryInitGame}
                  className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
                >
                  重试开局
                </button>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-2xl ${
                  message.type === 'player'
                    ? 'bg-violet-600/20 border border-violet-500/25 shadow-lg shadow-violet-950/20'
                    : 'bg-white/[0.04] border border-white/[0.08]'
                }`}
              >
                <div className="text-gray-500 text-xs mb-1">
                  {message.type === 'player' ? '你' : '系统'}
                </div>
                <div 
                  className="text-white whitespace-pre-wrap leading-relaxed" 
                  dangerouslySetInnerHTML={{
                    __html: renderMessageContent(message.content)
                  }} 
                />
              </div>
            ))}

            {streamCancellable && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAbortNarrative}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600/25 hover:bg-red-600/40 border border-red-500/40 text-red-200 transition-colors"
                >
                  <StopCircle className="w-4 h-4 shrink-0" />
                  {!currentScene ? '打断开局生成' : '打断并作废本回合'}
                </button>
              </div>
            )}

            {isLoading && streamNarrative !== '' && (
              <div className="p-4 rounded-2xl border border-violet-500/35 bg-violet-950/25 shadow-lg shadow-violet-950/20 ring-1 ring-violet-500/15">
                <div className="text-violet-300/95 text-xs mb-2 flex items-center gap-2 font-medium">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                  </span>
                  叙事流式输出中
                </div>
                <div
                  className="text-white whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMessageContent(streamNarrative),
                  }}
                />
              </div>
            )}

            {isLoading && streamNarrative === '' && (
              <div className="flex justify-center items-center py-4">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-4 flex-shrink-0">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleSubmit('详细描述当前情景')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded-lg text-blue-300 text-sm transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                详细描述当前情景
              </button>
              <button
                onClick={() => handleSubmit('推进剧情')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 rounded-lg text-green-300 text-sm transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                推进剧情
              </button>
            </div>
            
            <div className="flex gap-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的行动或对话..."
                rows={2}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={isLoading || !inputValue.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                {isLoading ? '思考中...' : '发送'}
              </button>
            </div>
          </div>
        </main>

        <aside className="w-full max-h-[38vh] shrink-0 lg:max-h-none lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.07] p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto bg-[#0a0812]/95 backdrop-blur-md">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                上下文
              </h3>
              <button
                onClick={handleCompress}
                disabled={isLoading || messages.length <= 1}
                className="px-3 py-1 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/30 rounded-lg text-orange-300 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                压缩
              </button>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${contextPercentage}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-400">{contextPercentage.toFixed(1)}%</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              当前位置
            </h3>
            {currentScene ? (
              <div>
                <div className="text-purple-400 font-semibold">{currentScene.location}</div>
              </div>
            ) : (
              <div className="text-gray-500">加载中...</div>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              时间寿元
            </h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-400">当前时间: <span className="text-amber-300">修仙历{playerState.currentYear || 1287}年</span></div>
              <div className="text-gray-400">寿元: <span className="text-amber-300">{playerState.currentAge || 20}/{getMaxLifespan(playerState.cultivationLevel)}岁</span></div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">玩家状态</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">生命值</span>
                    <span className="text-white">{playerState.health}/100</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                      style={{ width: `${playerState.health}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-red-400/70 mt-1 ml-6">{getHealthDescription(playerState.health)}</div>
              </div>

              {theme === 'cultivation' && playerState.cultivationLevel && (
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-cyan-400" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">修为</span>
                      <span className="text-cyan-400">{playerState.cultivationLevel}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-blue-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">声望</span>
                    <span className="text-white">{playerState.reputation}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                      style={{ width: `${Math.min(playerState.reputation, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-400" />
              背包
            </h3>
            {playerState.inventory.length > 0 ? (
              <div className="space-y-2">
                {playerState.inventory.map((item, index) => (
                  <div key={index} className="text-gray-300 text-sm">{escapeHtml(item)}</div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">背包为空</div>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">角色信息</h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-400">姓名: <span className="text-white">{escapeHtml(character.name)}</span></div>
              <div className="text-gray-400">年龄: <span className="text-white">{character.age}</span></div>
              <div className="text-gray-400">性别: <span className="text-white">{character.gender === 'male' ? '男' : '女'}</span></div>
              <div className="text-gray-400">种族: <span className="text-white">{character.race === 'custom' ? (character.customRace || '自定义') : character.race === 'human' ? '人族' : character.race === 'demon' ? '魔族' : '妖族'}</span></div>
              <div className="text-gray-400">玩家信息: <span className="text-white">{escapeHtml(character.playerInfo)}</span></div>
            </div>
          </div>
        </aside>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-white/20 rounded-2xl p-6 w-[420px] shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">保存存档</h3>
            <p className="text-gray-500 text-sm mb-4">
              共 {SAVE_SLOT_COUNT} 个固定槽位。保存后该槽将用于自动写入对话与状态
              {activeSaveSlotIndex !== null ? `（当前绑定：槽 ${activeSaveSlotIndex + 1}）` : ''}。
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
                const occ = saveSlotsPreview[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSaveSlotIndex(i)}
                    className={`rounded-xl border px-2 py-3 text-left text-xs transition-colors ${
                      saveSlotIndex === i
                        ? 'border-purple-500 bg-purple-600/20 text-white'
                        : 'border-white/15 bg-white/5 text-gray-300 hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">槽 {i + 1}</div>
                    {occ ? (
                      <div className="text-gray-400 truncate" title={occ.name}>
                        {occ.name}
                      </div>
                    ) : (
                      <div className="text-gray-500">空</div>
                    )}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="存档显示名称（可选）"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveGame}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors"
              >
                保存到槽 {saveSlotIndex + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-white/20 rounded-2xl p-6 w-[480px] max-h-[80vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">加载存档</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {loadSlotsPreview.map((save, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="text-xs text-gray-500 mb-2">存档槽 {idx + 1}</div>
                  {!save ? (
                    <p className="text-gray-500 text-sm py-2">空槽位</p>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{save.name}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                          <span>{save.character?.name}</span>
                          {save.playerState?.cultivationLevel && (
                            <span className="text-cyan-400">{save.playerState.cultivationLevel}</span>
                          )}
                          {save.currentScene && (
                            <span className="text-purple-400">{save.currentScene.location}</span>
                          )}
                          <span>{new Date(save.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSave(save, idx)}
                          className="px-3 py-1 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 rounded text-green-300 text-sm transition-colors"
                        >
                          加载
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearSlot(idx)}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-400 text-sm transition-colors"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}