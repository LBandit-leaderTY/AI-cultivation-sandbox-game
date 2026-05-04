import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { CharacterInfo, GenderType, RaceType, PerspectiveType } from '../types/game';
import { generateAICharacterInfo } from '../services/gameService';
import { User, Sparkles, ArrowLeft, Play, Venus, Mars, Eye, UserCircle } from 'lucide-react';

export default function CharacterCreate() {
  const navigate = useNavigate();
  const theme = useGameStore((state) => state.theme);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const startGame = useGameStore((state) => state.startGame);

  const [character, setCharacterForm] = useState<CharacterInfo>({
    name: '',
    age: 18,
    gender: 'male',
    background: '',
    playerInfo: '',
    race: 'human',
    customRace: '',
    appearance: '',
    perspective: 'first',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!theme) {
      navigate('/theme');
    }
  }, [theme, navigate]);

  const generateCharacter = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const result = await generateAICharacterInfo(theme!);
      if (result) {
        setCharacterForm(result);
      } else {
        setError('生成失败，请重试');
      }
    } catch (err) {
      setError('生成失败，请重试');
    }

    setIsGenerating(false);
  };

  const handleSubmit = () => {
    if (!character.name.trim()) {
      setError('请输入姓名');
      return;
    }

    let finalCharacter = { ...character };
    if (finalCharacter.background.length > 200) {
      finalCharacter.background = finalCharacter.background.substring(0, 200);
    }

    setCharacter(finalCharacter);
    startGame();
    navigate('/game');
  };

  const handleInputChange = (field: keyof CharacterInfo, value: string | number | GenderType | RaceType | PerspectiveType) => {
    setCharacterForm(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  if (!theme) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06050a] flex items-center justify-center p-4 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(168, 85, 247, 0.2), transparent 50%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(236, 72, 153, 0.1), transparent 45%)',
        }}
      />
      <div className="max-w-2xl w-full relative z-10">
        <button
          type="button"
          onClick={() => navigate('/theme')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回主题与世界</span>
        </button>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 border border-white/[0.08] shadow-2xl shadow-black/30">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">创建角色</h1>
              <p className="text-gray-400">自定义你的玩家信息</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2">姓名</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入你的姓名"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">年龄</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={character.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 18)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">性别</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInputChange('gender', 'male')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                      character.gender === 'male'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <Mars className="w-5 h-5" />
                    男
                  </button>
                  <button
                    onClick={() => handleInputChange('gender', 'female')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                      character.gender === 'female'
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                        : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <Venus className="w-5 h-5" />
                    女
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">种族</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleInputChange('race', 'human')}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.race === 'human'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm">人族</span>
                </button>
                <button
                  onClick={() => handleInputChange('race', 'demon')}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.race === 'demon'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm">魔族</span>
                </button>
                <button
                  onClick={() => handleInputChange('race', 'animal')}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.race === 'animal'
                      ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="text-sm">动物</span>
                </button>
                <button
                  onClick={() => handleInputChange('race', 'custom')}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.race === 'custom'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">自定义</span>
                </button>
              </div>
              {character.race === 'custom' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={character.customRace}
                    onChange={(e) => handleInputChange('customRace', e.target.value)}
                    placeholder="请输入自定义种族名称，如：龙族、精灵族、矮人族等"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2">外貌/身材</label>
              <textarea
                value={character.appearance}
                onChange={(e) => handleInputChange('appearance', e.target.value)}
                placeholder="描述你的外貌特征，如：身高、体型、发色、穿着打扮等"
                rows={2}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">自身性格</label>
              <textarea
                value={character.playerInfo}
                onChange={(e) => handleInputChange('playerInfo', e.target.value)}
                placeholder="描述你的性格特点，如：乐观开朗、沉默寡言等"
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              <p className="text-gray-500 text-xs mt-1">例如：性格沉稳冷静，善于思考，对朋友忠诚可靠</p>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">人称</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleInputChange('perspective', 'first')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.perspective === 'first'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <span className="text-sm">第一人称</span>
                </button>
                <button
                  onClick={() => handleInputChange('perspective', 'second')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.perspective === 'second'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <span className="text-sm">第二人称</span>
                </button>
                <button
                  onClick={() => handleInputChange('perspective', 'third')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    character.perspective === 'third'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <span className="text-sm">第三人称</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                背景故事
                <span className="text-gray-500 text-xs ml-2">（限200字）</span>
              </label>
              <textarea
                value={character.background}
                onChange={(e) => handleInputChange('background', e.target.value)}
                placeholder="简述主角的生平以及一些重要的事情"
                rows={4}
                maxLength={200}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              <p className="text-gray-500 text-xs mt-1 text-right">{character.background.length}/200</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              onClick={generateCharacter}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? '生成中...' : 'AI生成身份'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30"
            >
              <Play className="w-5 h-5" />
              开始游戏
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
