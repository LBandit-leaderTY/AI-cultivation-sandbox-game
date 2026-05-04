import type { SaveData } from '../types/game';

export const SAVE_SLOT_COUNT = 3;

const SLOTS_KEY = 'gameSaveSlots';
const LEGACY_KEY = 'gameSaves';

function normalizeSlots(arr: unknown): (SaveData | null)[] {
  const slots: (SaveData | null)[] = [null, null, null];
  if (!Array.isArray(arr)) return slots;
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const item = arr[i];
    if (
      item &&
      typeof item === 'object' &&
      'id' in item &&
      'theme' in item &&
      'character' in item
    ) {
      slots[i] = item as SaveData;
    }
  }
  return slots;
}

/** 读取三个固定槽位；首次运行或旧格式时从 `gameSaves` 迁移并写入新键 */
export function loadSaveSlots(): (SaveData | null)[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) {
      return normalizeSlots(JSON.parse(raw));
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown;
      const list = Array.isArray(parsed) ? parsed : [];
      const slots: (SaveData | null)[] = [null, null, null];
      for (let i = 0; i < SAVE_SLOT_COUNT && i < list.length; i++) {
        const item = list[i];
        if (item && typeof item === 'object' && 'id' in item && 'theme' in item) {
          slots[i] = item as SaveData;
        }
      }
      writeSaveSlots(slots);
      localStorage.removeItem(LEGACY_KEY);
      return slots;
    }
  } catch {
    /* ignore */
  }
  return [null, null, null];
}

export function writeSaveSlots(slots: (SaveData | null)[]): void {
  const normalized: (SaveData | null)[] = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    normalized.push(slots[i] ?? null);
  }
  localStorage.setItem(SLOTS_KEY, JSON.stringify(normalized));
}

export function setSlot(
  slots: (SaveData | null)[],
  index: number,
  data: SaveData | null
): (SaveData | null)[] {
  if (index < 0 || index >= SAVE_SLOT_COUNT) return slots;
  const next = [...slots];
  next[index] = data;
  return next;
}
