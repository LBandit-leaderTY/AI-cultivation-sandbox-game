export type ThemeType = 'cultivation' | 'academy';

export type EmotionType = 'friendly' | 'neutral' | 'hostile' | 'curious';

export type GenderType = 'male' | 'female';

export type RaceType = 'human' | 'demon' | 'animal' | 'custom';

export type PerspectiveType = 'first' | 'second' | 'third';

export interface CharacterInfo {
  name: string;
  age: number;
  gender: GenderType;
  background: string;
  playerInfo: string;
  race: RaceType;
  customRace: string;
  appearance: string;
  perspective: PerspectiveType;
}

export interface Character {
  id: string;
  name: string;
  emotion: EmotionType;
  dialogue: string;
}

export interface SceneData {
  location: string;
  narrative: string;
}

export interface PlayerState {
  health: number;
  energy: number;
  reputation: number;
  inventory: string[];
  cultivationLevel?: string;
  currentYear: number;
  currentAge: number;
  maxLifespan: number;
}

export interface GameState {
  theme: ThemeType | null;
  character: CharacterInfo | null;
  currentScene: SceneData | null;
  characters: Character[];
  playerState: PlayerState;
  gameId: string | null;
  isPlaying: boolean;
  messages: GameMessage[];
}

export interface GameMessage {
  id: string;
  content: string;
  type: 'system' | 'player' | 'character';
  characterId?: string;
  timestamp: Date;
}

export interface ConfigState {
  apiKey: string;
  customApiUrl: string;
  model: string;
  maxCharacters: number;
  maxTokens: number;
}

export interface GameActionRequest {
  gameId: string;
  action: string;
}

export type SavedMessage = {
  id: string;
  content: string;
  type: 'system' | 'player' | 'character';
  characterId?: string;
  /** 毫秒时间戳，用于恢复对话顺序与展示 */
  timestamp?: number;
};

export interface SaveData {
  id: string;
  name: string;
  timestamp: number;
  theme: ThemeType;
  character: CharacterInfo;
  currentScene: SceneData | null;
  playerState: PlayerState;
  messages: SavedMessage[];
  gameId: string | null;
  /** 场上 NPC 快照（若有） */
  characters?: Character[];
}

export interface GameActionResponse {
  success: boolean;
  scene: SceneData;
  characters: Character[];
  playerState: PlayerState;
  response: string;
}