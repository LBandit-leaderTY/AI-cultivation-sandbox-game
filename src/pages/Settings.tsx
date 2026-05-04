import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../store/configStore';
import { ArrowLeft, Save, Key, Users, FileText, ChevronDown, ChevronUp, HardDrive } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export default function Settings() {
  const navigate = useNavigate();
  const hasActiveGame = useGameStore((s) => Boolean(s.theme && s.character));
  const config = useConfigStore();
  const setApiKey = useConfigStore((state) => state.setApiKey);
  const setCustomApiUrl = useConfigStore((state) => state.setCustomApiUrl);
  const setModel = useConfigStore((state) => state.setModel);
  const setMaxCharacters = useConfigStore((state) => state.setMaxCharacters);
  const setMaxTokens = useConfigStore((state) => state.setMaxTokens);

  const [localApiKey, setLocalApiKey] = useState(config.apiKey);
  const [localCustomApiUrl, setLocalCustomApiUrl] = useState(config.customApiUrl);
  const [localModel, setLocalModel] = useState(config.model);
  const [localMaxCharacters, setLocalMaxCharacters] = useState(config.maxCharacters);
  const [localMaxTokens, setLocalMaxTokens] = useState(config.maxTokens);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(localApiKey);
    setCustomApiUrl(localCustomApiUrl);
    setModel(localModel);
    setMaxCharacters(localMaxCharacters);
    setMaxTokens(localMaxTokens);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06050a] flex items-center justify-center p-4 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 80% 10%, rgba(124, 58, 237, 0.2), transparent 50%)',
        }}
      />
      <div className="max-w-2xl w-full relative z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 border border-white/[0.08] shadow-2xl shadow-black/30">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 flex items-center justify-center">
              <Key className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">设置</h1>
              <p className="text-gray-400">配置游戏参数</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 text-gray-300 text-sm mb-3">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-white">存档</span>
              </div>
              <p className="text-gray-500 text-xs mb-3">
                游戏使用三个固定存档槽。在存档页管理槽位；对局中也可用顶栏保存/加载图标。
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/saves')}
                  className="px-4 py-2 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-200 text-sm font-medium transition-colors"
                >
                  打开存档管理
                </button>
                {hasActiveGame && (
                  <button
                    type="button"
                    onClick={() => navigate('/game')}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-gray-200 text-sm transition-colors"
                  >
                    返回游戏
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">API地址</label>
              <input
                type="text"
                value={localCustomApiUrl}
                onChange={(e) => setLocalCustomApiUrl(e.target.value)}
                placeholder="https://api.example.com/v1/chat/completions"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">模型名称</label>
              <input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                placeholder="gpt-4, qwen-turbo 等"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">API Key</label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="请输入API密钥（可选，留空使用演示模式）"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-xs mt-1">
                当前模型：{localModel}
              </p>
            </div>

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

                <div>
                  <label className="flex items-center gap-2 block text-gray-300 text-sm mb-2">
                    <FileText className="w-4 h-4" />
                    最大Token数
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="100"
                      value={localMaxTokens}
                      onChange={(e) => setLocalMaxTokens(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-semibold w-16 text-center">
                      {localMaxTokens}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className={`mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30'
            }`}
          >
            <Save className="w-5 h-5" />
            {saved ? '保存成功' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}