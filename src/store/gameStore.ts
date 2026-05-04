import { create } from 'zustand';
import { ThemeType, CharacterInfo, SceneData, Character, PlayerState, GameState, GameMessage, SaveData } from '../types/game';

interface GameStore extends GameState {
  /** 当前绑定的存档槽（用于自动保存与手动默认槽）；空为未绑定 */
  activeSaveSlotIndex: number | null;
  setActiveSaveSlot: (index: number | null) => void;
  setTheme: (theme: ThemeType) => void;
  setCharacter: (character: CharacterInfo) => void;
  startGame: () => void;
  setCurrentScene: (scene: SceneData) => void;
  setCharacters: (characters: Character[]) => void;
  updatePlayerState: (state: Partial<PlayerState>) => void;
  addMessage: (message: Omit<GameMessage, 'id' | 'timestamp'>) => void;
  /** 撤销最后一条消息（用于打断流式输出、作废本回合玩家输入） */
  popLastMessage: () => void;
  clearMessages: () => void;
  endGame: () => void;
  loadSave: (save: SaveData) => void;
}

const initialPlayerState: PlayerState = {
  health: 100,
  energy: 100,
  reputation: 0,
  inventory: [],
  currentYear: 1287,
  currentAge: 20,
  maxLifespan: 100,
};

export const useGameStore = create<GameStore>((set) => ({
  theme: null,
  character: null,
  currentScene: null,
  characters: [],
  playerState: initialPlayerState,
  gameId: null,
  isPlaying: false,
  messages: [],
  activeSaveSlotIndex: null,

  setActiveSaveSlot: (index) => set({ activeSaveSlotIndex: index }),

  setTheme: (theme) => set({ theme }),

  setCharacter: (character) => set({ character }),

  startGame: () => set({ 
    isPlaying: true, 
    gameId: `game-${Date.now()}`,
    messages: [],
    playerState: initialPlayerState 
  }),

  setCurrentScene: (scene) => set({ currentScene: scene }),

  setCharacters: (characters) => set({ characters }),

  updatePlayerState: (state) => set((prev) => ({ 
    playerState: { ...prev.playerState, ...state } 
  })),

  addMessage: (message) => set((prev) => ({
    messages: [
      ...prev.messages,
      {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      },
    ],
  })),

  popLastMessage: () =>
    set((prev) =>
      prev.messages.length === 0
        ? prev
        : { messages: prev.messages.slice(0, -1) }
    ),

  clearMessages: () => set({ messages: [] }),

  endGame: () => set({
    theme: null,
    character: null,
    currentScene: null,
    characters: [],
    playerState: initialPlayerState,
    gameId: null,
    isPlaying: false,
    messages: [],
    activeSaveSlotIndex: null,
  }),

  loadSave: (save) =>
    set({
      theme: save.theme,
      character: save.character,
      currentScene: save.currentScene,
      playerState: save.playerState,
      messages: save.messages.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        ...(m.characterId ? { characterId: m.characterId } : {}),
        timestamp:
          typeof m.timestamp === 'number' && !Number.isNaN(m.timestamp)
            ? new Date(m.timestamp)
            : new Date(),
      })),
      gameId: save.gameId,
      isPlaying: true,
      characters: save.characters ?? [],
    }),
}));