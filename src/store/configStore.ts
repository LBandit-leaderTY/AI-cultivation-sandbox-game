import { create } from 'zustand';
import { ConfigState } from '../types/game';

interface ConfigStore extends ConfigState {
  setApiKey: (key: string) => void;
  setCustomApiUrl: (url: string) => void;
  setModel: (model: string) => void;
  setMaxCharacters: (max: number) => void;
  setMaxTokens: (max: number) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  apiKey: localStorage.getItem('apiKey') || '',
  customApiUrl: localStorage.getItem('customApiUrl') || 'https://api.siliconflow.cn/v1/chat/completions',
  model: localStorage.getItem('model') || 'gpt-4',
  maxCharacters: parseInt(localStorage.getItem('maxCharacters') || '3'),
  maxTokens: parseInt(localStorage.getItem('maxTokens') || '2500'),

  setApiKey: (key) => {
    localStorage.setItem('apiKey', key);
    set({ apiKey: key });
  },

  setCustomApiUrl: (url) => {
    localStorage.setItem('customApiUrl', url);
    set({ customApiUrl: url });
  },

  setModel: (model) => {
    localStorage.setItem('model', model);
    set({ model });
  },

  setMaxCharacters: (max) => {
    localStorage.setItem('maxCharacters', max.toString());
    set({ maxCharacters: Math.min(max, 8) });
  },

  setMaxTokens: (max) => {
    localStorage.setItem('maxTokens', max.toString());
    set({ maxTokens: max });
  },
}));