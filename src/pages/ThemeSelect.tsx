import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useConfigStore } from '../store/configStore';
import { ThemeType } from '../types/game';
import { testApiConnection, ApiTestResult } from '../services/gameService';
import { Swords, GraduationCap, Key, Users, ChevronDown, ChevronUp, Sparkles, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

const themes: { id: ThemeType; name: string; description: string; icon: typeof Swords; bgGradient: string; disabled?: boolean; comingSoon?: boolean }[] = [
  {
    id: 'cultivation',
    name: '修真玄幻',
    description: '踏入此处，修炼成仙，探索神秘的修真世界',
    icon: Swords,
    bgGradient: 'from-amber-900/20 via-orange-900/20 to-red-900/20',
  },
  {
    id: 'academy',
    name: '现代学院',
    description: '进入星澜学院，学习魔法，开启奇幻的校园生活',
    icon: GraduationCap,
    bgGradient: 'from-blue-900/20 via-purple-900/20 to-pink-900/20',
    disabled: true,
    comingSoon: true,
  },
];

export default function ThemeSelect() {
  const navigate = useNavigate();
  const setTheme = useGameStore((state) => state.setTheme);
  const config = useConfigStore();
  const setApiKey = useConfigStore((state) => state.setApiKey);
  const setCustomApiUrl = useConfigStore((state) => state.setCustomApiUrl);
  const setModel = useConfigStore((state) => state.setModel);
  const setMaxCharacters = useConfigStore((state) => state.setMaxCharacters);

  const [localApiKey, setLocalApiKey] = useState(config.apiKey);
  const [localCustomApiUrl, setLocalCustomApiUrl] = useState(config.customApiUrl);
  const [localModel, setLocalModel] = useState(config.model);
  const [localMaxCharacters, setLocalMaxCharacters] = useState(config.maxCharacters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    const result = await testApiConnection(localApiKey, localCustomApiUrl, localModel);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSelect = (theme: ThemeType) => {
    const selectedTheme = themes.find(t => t.id === theme);
    if (selectedTheme && 'disabled' in selectedTheme && selectedTheme.disabled) {
      alert('该主题正在开发中，敬请期待！');
      return;
    }
    setApiKey(localApiKey);
    setCustomApiUrl(localCustomApiUrl);
    setModel(localModel);
    setMaxCharacters(localMaxCharacters);
    setTheme(theme);
    navigate('/character');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06050a] flex items-center justify-center p-4 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse 100% 70% at 50% -10%, rgba(99, 102, 241, 0.25), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(244, 63, 94, 0.12), transparent 40%)',
        }}
      />
      <div className="max-w-4xl mx-auto w-full relative z-10">
        <button
          type="button"
          onClick={() => navigate('/saves')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回存档选择
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 mb-6 shadow-lg shadow-purple-500/25">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-4">
            AI对话游戏
          </h1>
          <p className="text-xl text-gray-300">选择你的游戏世界，开启奇幻冒险</p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] mb-8 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API配置</h2>
              <p className="text-xs text-gray-400">配置AI模型和API密钥，然后点击测试按钮验证</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">API地址</label>
              <input
                type="text"
                value={localCustomApiUrl}
                onChange={(e) => {
                  setLocalCustomApiUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://api.example.com/v1/chat/completions"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">模型名称</label>
              <input
                type="text"
                value={localModel}
                onChange={(e) => {
                  setLocalModel(e.target.value);
                  setTestResult(null);
                }}
                placeholder="gpt-4, qwen-turbo 等"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">API Key</label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="请输入API密钥"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTestApi}
                disabled={isTesting || !localCustomApiUrl || !localApiKey || !localModel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    测试API连接
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.message}
                  </span>
                </div>
                {testResult.details && (
                  <p className="mt-2 text-sm text-gray-300 break-all">{testResult.details}</p>
                )}
              </div>
            )}

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full justify-start"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              高级设置
            </button>

            {showAdvanced && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div>
                  <label className="flex items-center gap-2 block text-gray-300 text-sm mb-2">
                    <Users className="w-4 h-4" />
                    最大角色数量（1-8人，默认3人）
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={localMaxCharacters}
                      onChange={(e) => setLocalMaxCharacters(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-semibold w-8 text-center">
                      {localMaxCharacters}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {themes.map((theme) => {
            const Icon = theme.icon;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${theme.disabled ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-0 ${!theme.disabled ? 'group-hover:opacity-100' : ''} transition-opacity duration-500`} />
                
                {theme.disabled && (
                  <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-20" />
                )}
                
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  {theme.comingSoon && (
                    <div className="absolute top-2 right-2 px-3 py-1 bg-amber-500/90 text-white text-xs font-bold rounded-full shadow-lg">
                      开发中
                    </div>
                  )}
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 flex items-center justify-center ${theme.disabled ? '' : 'group-hover:scale-110'} transition-transform duration-300`}>
                    <Icon className={`w-10 h-10 ${theme.disabled ? 'text-gray-500' : 'text-white'}`} />
                  </div>
                  
                  <h2 className={`text-3xl font-bold mb-3 text-center ${theme.disabled ? 'text-gray-400' : 'text-white group-hover:text-purple-300'} transition-colors`}>
                    {theme.name}
                  </h2>
                  
                  <p className={`text-center text-sm leading-relaxed ${theme.disabled ? 'text-gray-500' : 'text-gray-400'}`}>
                    {theme.description}
                  </p>
                </div>

                <div className="absolute bottom-6 right-6 text-7xl font-bold text-white/5 group-hover:text-white/10 transition-colors">
                  {theme.id === 'cultivation' ? '仙' : '魔'}
                </div>

                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {theme.disabled ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      开发中
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      可玩
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            提示：配置好API后点击测试按钮验证，然后选择主题开始游戏
          </p>
        </div>
      </div>
    </div>
  );
}
