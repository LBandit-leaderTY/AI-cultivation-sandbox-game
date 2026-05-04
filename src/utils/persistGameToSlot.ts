import { useGameStore } from '../store/gameStore';
import type { SaveData } from '../types/game';
import { loadSaveSlots, writeSaveSlots, setSlot } from './saveSlots';

function messageToSave(m: {
  id: string;
  content: string;
  type: 'system' | 'player' | 'character';
  characterId?: string;
  timestamp: Date;
}) {
  return {
    id: m.id,
    content: m.content,
    type: m.type,
    ...(m.characterId ? { characterId: m.characterId } : {}),
    timestamp: m.timestamp.getTime(),
  };
}

/** 从当前 Zustand 状态构建存档快照（需已有 theme + character） */
export function buildSaveDataFromStore(name: string): SaveData | null {
  const s = useGameStore.getState();
  if (!s.theme || !s.character) return null;

  return {
    id: `save-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name,
    timestamp: Date.now(),
    theme: s.theme,
    character: s.character,
    currentScene: s.currentScene,
    playerState: s.playerState,
    messages: s.messages.map(messageToSave),
    gameId: s.gameId,
    characters: s.characters?.length ? s.characters : undefined,
  };
}

/** 写入指定槽位；名称优先使用 nameOverride，否则沿用槽内旧名或默认时间戳名 */
export function persistGameToSlot(slotIndex: number, nameOverride?: string): boolean {
  const slots = loadSaveSlots();
  const existing = slots[slotIndex];
  const name =
    (nameOverride?.trim() || existing?.name || `存档槽 ${slotIndex + 1} · ${new Date().toLocaleString()}`).trim();

  const data = buildSaveDataFromStore(name);
  if (!data) return false;

  const next = setSlot(slots, slotIndex, data);
  writeSaveSlots(next);
  return true;
}
