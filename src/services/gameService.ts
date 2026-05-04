/**
 * 修真主题下与大模型的对话组装、请求与解析。
 * 提示词分层与各入口说明见：`src/prompts/cultivation-v3.1.md` → **附录B：客户端 AI 调用逻辑**。
 */
import { ThemeType, CharacterInfo, GenderType, RaceType, PerspectiveType, PlayerState } from '../types/game';
import { useConfigStore } from '../store/configStore';
import CULTIVATION_CORE from '../prompts/cultivation-core.md?raw';
import CULTIVATION_WORLD from '../prompts/cultivation-v3.1.md?raw';

/** 用户点击「打断」中止流式请求时抛出，与超时/网络错误区分 */
export class UserStreamAbortError extends Error {
  constructor() {
    super('USER_STREAM_ABORT');
    this.name = 'UserStreamAbortError';
  }
}

/** 主叙事 chat 请求超时（毫秒）；避免网络挂死时界面无限转圈 */
const DEFAULT_CHAT_TIMEOUT_MS = 120_000;

/**
 * 后续回合 user 侧不再附带数万字的 v3.1 全文，显著降低输入 token 与首包延迟。
 * 世界观硬约束仍由 system（cultivation-core）承载；开场首请求仍用 full 正文。
 */
const USER_WORLD_CONTINUATION_ANCHOR = `【叙事延续模式】
《凡人修仙传》人界篇完整设定正文已在**游戏开场首条用户消息**中提供；本回合**不再重复**该长文。你必须继续遵守**系统提示**中的全部硬性规则（JSON 结构、不在 narrative 写状态栏与数字行动菜单、NPC 上限、状态锚定、连贯叙事等）。
请仅依据下方的「当前界面状态」「游戏前情」与玩家本回合行动续写；禁止无故重置境界、背包、地点与已建立的人物关系。`;

const CHARACTER_GEN_CONTEXT = `【角色生成 - 凡人修仙传人界篇沙盒】
为玩家随机生成一名可开局角色：人界弱肉强食、宗门与散修并存；境界从炼气起步常见。主角不是韩立。输出须为严格 JSON，字段与类型见下文指令。`;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(id);
  }
}

export const generatePrompt = (
  theme: ThemeType,
  character: CharacterInfo,
  action: string,
  maxCharacters: number,
  maxTokens: number,
  currentLocation?: string
): string => {
  const genderLabel = character.gender === 'male' ? '男' : '女';
  
  const raceLabels: Record<RaceType, string> = {
    'human': '人族',
    'demon': '魔族',
    'animal': '妖族',
    'custom': character.customRace || '自定义种族',
  };
  const raceLabel = raceLabels[character.race] || '人族';
  
  const perspectiveInstructions: Record<PerspectiveType, string> = {
    'first': '第一人称，以"我"指代玩家',
    'second': '第二人称，以"你"指代玩家',
    'third': `第三人称，以"${character.name}"或"他/她"指代玩家`,
  };
  const perspectiveInstruction = perspectiveInstructions[character.perspective] || perspectiveInstructions['first'];
  
  let actionPrompt = action;
  let specialInstruction = '';
  
  if (action === '详细描述当前情景') {
    specialInstruction = `
【特殊指令：详细描述当前情景】
展开环境描写至八句以上，调动五感。详细描述每个在场NPC的外貌、神态、小动作。描述可交互的物品、隐藏的路径、可疑的细节。提供额外的背景信息（如该地点的历史、传闻）。`;
  } else if (action === '推进剧情') {
    specialInstruction = `
【特殊指令：推进剧情】
根据当前主线目标推进剧情。触发下一个关键事件。引入新的NPC或推进现有NPC的剧情线。给出明确的下一步行动提示。`;
  }
  
  const locationInfo = currentLocation ? `\n当前地点：${currentLocation}\n` : '';

  const maxNpc = useConfigStore.getState().maxCharacters;

  return `
【叙事质量】
narrative 以连贯、可画面化优先：建议约 400–1200 字（中文），分多段；避免堆砌无关路人、无关支线或与当前行动无关的长篇设定复述。对白与动作推动情节，少用空洞形容词堆砌。

玩家身份信息：
- 姓名：${character.name}
- 年龄：${character.age}
- 性别：${genderLabel}
- 种族：${raceLabel}
${character.appearance ? `- 外貌/身材：${character.appearance}` : ''}
- 自身性格：${character.playerInfo}
- 背景故事：${character.background}

${locationInfo}
叙述人称：${perspectiveInstruction}

NPC上限：当前场景最多出现${maxNpc}个NPC。

玩家的行动：${actionPrompt}
${specialInstruction}

输出要求：
输出格式为JSON，包含以下字段：
- "location": 当前地点简短名称
- "narrative": 叙事文本，仅包含环境描写+NPC对话+情感色彩+角色互动；详略得当，禁止为凑字数重复同一信息
- "playerState": 玩家状态对象，包含 health(0-100整数)、energy(0-100整数)、reputation(0-100整数)、inventory(字符串数组)、cultivationLevel(字符串)、currentYear(修仙历年份整数)、currentAge(当前年龄整数)、maxLifespan(按境界推算的最大寿元整数)

【输出格式示例】
{
  "location": "青竹村——村口老槐树下",
  "narrative": "夕阳西沉，老槐树的影子拉得很长。一位灰袍老者拄着竹杖缓步走来，打量你片刻后开口：\u201c小友，看你灵根清澈，可愿入我宗门修行？\u201d他心中暗想：\u2018此子资质尚可，但心性如何尚需观察\u2019。",
  "playerState": {
    "health": 100,
    "energy": 95,
    "reputation": 0,
    "inventory": ["青钢剑", "低阶灵石30枚"],
    "cultivationLevel": "炼气期三层",
    "currentYear": 1287,
    "currentAge": 20,
    "maxLifespan": 100
  }
}

【极其重要，必须严格遵守】
narrative字段中绝对不能包含以下任何内容：
- 不能输出"你有以下选择"、"可选择的行动"、"你可以："、"请选择你的行动"等行动选项文字
- 不能输出任何以数字列表形式的行动选项（如"1. xxx"、"2. xxx"）
- 不能输出状态栏信息（如"境界："、"灵石："、"丹药："、"法宝："、"身体："、"危机："、"生命："、"法力：")
- 不能输出以"---"或"==="分隔的区域
- narrative只用自然段落描述环境和NPC对话，不要输出结构化数据

对话格式：
- NPC说的话只能用中文双引号\u201c\u201d包裹，例如：他说道\u201c这位道友请留步\u201d
- NPC心理活动只能用中文单引号\u2018\u2019包裹，例如：他暗想\u2018此人来历不明\u2019
- 不要使用**标记包裹对话
- 不要使用英文引号，必须使用中文引号

确保JSON完整闭合，narrative字段内的双引号必须用反斜杠转义：\\"`.trim();
};

const buildSystemPrompt = (): string => {
  const maxNpc = useConfigStore.getState().maxCharacters;
  return CULTIVATION_CORE.replace(/\{maxNpcCount\}/g, String(maxNpc));
};

const RECENT_PROMPT_CHAR_LIMIT = 14000;

/** 将最近对话压入提示词，供模型承接剧情（避免每轮只看当前一句） */
const formatAnchorStateForPrompt = (
  location: string | undefined,
  ps: PlayerState
): string => {
  const inv = ps.inventory?.length ? ps.inventory.join('、') : '无';
  const lines = [
    `地点（上一回合界面）：${location?.trim() || '未知'}`,
    `生命 ${ps.health}/100，精力 ${ps.energy}/100，声望 ${ps.reputation}`,
    ps.cultivationLevel ? `境界：${ps.cultivationLevel}` : '',
    `背包：${inv}`,
    `修仙历 ${ps.currentYear} 年，年龄 ${ps.currentAge}，寿元上限参考 ${ps.maxLifespan}`,
  ].filter(Boolean);
  return lines.join('\n');
};

export const formatRecentMessagesForPrompt = (
  messages: Array<{ type: string; content: string }>
): string => {
  if (!messages.length) return '';
  const lines = messages.map((m, i) => {
    const role =
      m.type === 'player' ? '玩家' : m.type === 'system' ? '叙事' : '其他';
    return `[回合片段 ${i + 1}] ${role}：${m.content.trim()}`;
  });
  let text = lines.join('\n\n');
  if (text.length > RECENT_PROMPT_CHAR_LIMIT) {
    text =
      '（更早记录已省略，以下从靠近当前处接续）\n\n' +
      text.slice(-RECENT_PROMPT_CHAR_LIMIT);
  }
  return text;
};

export type UserWorldPayload = 'full' | 'continuation';

const buildUserPrompt = (
  theme: ThemeType,
  character: CharacterInfo,
  action: string,
  maxCharacters: number,
  maxTokens: number,
  currentLocation?: string,
  recentConversationBlock?: string,
  worldPayload: UserWorldPayload = 'full'
): string => {
  const maxNpc = useConfigStore.getState().maxCharacters;
  const worldContext =
    worldPayload === 'full'
      ? CULTIVATION_WORLD.replace(/\{maxNpcCount\}/g, String(maxNpc))
      : USER_WORLD_CONTINUATION_ANCHOR;
  const historyTrim = (recentConversationBlock ?? '').trim();
  const historySection = historyTrim
    ? `【游戏前情 - 必须严格承接，禁止自相矛盾】\n${historyTrim}\n\n---\n\n`
    : '';
  return (
    worldContext +
    '\n\n---\n\n' +
    historySection +
    generatePrompt(theme, character, action, maxCharacters, maxTokens, currentLocation)
  );
};

export interface ApiTestResult {
  success: boolean;
  message: string;
  details?: string;
}

export const testApiConnection = async (
  apiKey: string,
  customApiUrl: string,
  model: string
): Promise<ApiTestResult> => {
  if (!customApiUrl) {
    return { success: false, message: '请输入API地址' };
  }
  if (!apiKey) {
    return { success: false, message: '请输入API Key' };
  }
  if (!model) {
    return { success: false, message: '请输入模型名称' };
  }

  try {
    const response = await fetch(customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API请求失败 (${response.status})`, details: errorText };
    }

    const data = await response.json();
    if (data.choices?.[0]?.message) {
      return { success: true, message: 'API连接成功！', details: `模型响应: ${data.choices[0].message.content}` };
    }
    return { success: false, message: 'API响应格式异常', details: JSON.stringify(data) };
  } catch (error: any) {
    return { success: false, message: '连接失败', details: error.message || '未知错误' };
  }
};

const cleanContent = (text: string): string => {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
};

const cleanNarrative = (narrative: string): string => {
  let text = narrative;

  const cutPatterns = [
    /\n*---+\s*\n[\s\S]*$/,
    /\n*==+\s*\n[\s\S]*$/,
    /\n*你有以下选择[\s\S]*$/,
    /\n*可选择的行动[\s\S]*$/,
    /\n*请选择你的行动[\s\S]*$/,
    /\n*你可以：[\s\S]*$/,
    /\n*【可选择[\s\S]*$/,
    /\n*【行动[\s\S]*$/,
    /\n*\d+\.\s*(?:交涉|探查|逃离|备战|推进剧情|详细描述|攻击|防御|逃跑|询问|购买|出售)[\s\S]*$/,
    /\n*境界：[\s\S]*$/,
    /\n*灵石：[\s\S]*$/,
    /\n*丹药：[\s\S]*$/,
    /\n*法宝：[\s\S]*$/,
    /\n*身体：[\s\S]*$/,
    /\n*危机：[\s\S]*$/,
    /\n*生命值?：[\s\S]*$/,
    /\n*法力值?：[\s\S]*$/,
  ];

  for (const pattern of cutPatterns) {
    text = text.replace(pattern, '');
  }

  return text.trim();
};

const tryParseJson = (text: string): any | null => {
  try { return JSON.parse(text.trim()); } catch { return null; }
};

/**
 * 从可能仍不完整的模型输出中，尽量解析出 JSON 里 "narrative" 字符串已出现的部分，供流式展示。
 * 按 JSON 转义规则处理 \\、\"、\n、\uXXXX。
 */
export function extractPartialNarrativeFromJsonBuffer(buffer: string): string {
  const m = buffer.match(/"narrative"\s*:\s*"/);
  if (!m || m.index === undefined) return '';
  let i = m.index + m[0].length;
  let out = '';
  while (i < buffer.length) {
    const c = buffer[i];
    if (c === '\\') {
      if (i + 1 >= buffer.length) break;
      const n = buffer[i + 1];
      if (n === 'n') {
        out += '\n';
        i += 2;
        continue;
      }
      if (n === 't') {
        out += '\t';
        i += 2;
        continue;
      }
      if (n === 'r') {
        out += '\r';
        i += 2;
        continue;
      }
      if (n === '"' || n === '\\') {
        out += n;
        i += 2;
        continue;
      }
      if (n === 'u' && i + 5 < buffer.length) {
        const hex = buffer.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
      }
      out += n;
      i += 2;
      continue;
    }
    if (c === '"') break;
    out += c;
    i += 1;
  }
  return out;
}

async function readOpenAiSSEStream(
  body: ReadableStream<Uint8Array>,
  onTextDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let lineBuffer = '';
  const flushLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const j = JSON.parse(payload);
      const piece = j.choices?.[0]?.delta?.content;
      if (typeof piece === 'string' && piece.length) {
        full += piece;
        onTextDelta(piece);
      }
    } catch {
      /* 半行 SSE */
    }
  };

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) flushLine(line);
    }
    lineBuffer += decoder.decode();
    for (const line of lineBuffer.split('\n')) flushLine(line);
    return full;
  } finally {
    reader.releaseLock();
  }
}

async function fetchChatCompletionStream(
  url: string,
  apiKey: string,
  bodyBase: Record<string, unknown>,
  timeoutMs: number,
  onTextDelta: (delta: string) => void,
  userAbortSignal?: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  let abortKind: 'user' | 'timeout' | null = null;

  const id = globalThis.setTimeout(() => {
    abortKind = abortKind ?? 'timeout';
    controller.abort();
  }, timeoutMs);

  const onUserAbort = () => {
    abortKind = 'user';
    controller.abort();
  };
  userAbortSignal?.addEventListener('abort', onUserAbort);

  if (userAbortSignal?.aborted) {
    globalThis.clearTimeout(id);
    userAbortSignal.removeEventListener('abort', onUserAbort);
    throw new UserStreamAbortError();
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...bodyBase, stream: true }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }
    if (!response.body) throw new Error('API 流式响应无 body');
    return await readOpenAiSSEStream(response.body, onTextDelta, controller.signal);
  } catch (e: unknown) {
    if (abortKind === 'user') {
      throw new UserStreamAbortError();
    }
    if (abortKind === 'timeout' || (e instanceof DOMException && e.name === 'AbortError')) {
      throw new Error(
        `API 请求超时（超过 ${timeoutMs / 1000} 秒未返回）。可尝试：检查网络、更换更快模型，或在设置中调低「最大 Token」以加快生成。`
      );
    }
    throw e;
  } finally {
    globalThis.clearTimeout(id);
    userAbortSignal?.removeEventListener('abort', onUserAbort);
  }
}

async function mockResponseWithStreaming(
  action: string | undefined,
  currentLocation: string | undefined,
  onNarrativePreview: (partial: string) => void,
  userAbortSignal?: AbortSignal
): Promise<any> {
  const res = generateMockResponse(action || '开始游戏', currentLocation);
  const nar = res.scene.narrative;
  const step = 24;
  if (!nar.length) {
    onNarrativePreview('');
    return res;
  }
  for (let end = Math.min(step, nar.length); ; end = Math.min(end + step, nar.length)) {
    if (userAbortSignal?.aborted) throw new UserStreamAbortError();
    onNarrativePreview(nar.slice(0, end));
    await new Promise((r) => globalThis.setTimeout(r, 20));
    if (end >= nar.length) break;
  }
  onNarrativePreview(nar);
  return res;
}

const extractValidJson = (content: string): any | null => {
  let result = tryParseJson(content);
  if (result?.location && result?.narrative) return result;

  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    result = tryParseJson(codeBlock[1].trim());
    if (result?.location && result?.narrative) return result;
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = content.substring(firstBrace, lastBrace + 1);
    result = tryParseJson(extracted);
    if (result?.location && result?.narrative) return result;
  }

  return null;
};

const buildFallbackResponse = (text: string, currentLocation?: string): any => {
  console.log('使用回退模式构建响应');

  let location = currentLocation || '未知地点';
  const locMatch = text.match(/【(.+?)】/);
  if (locMatch) {
    location = locMatch[1].trim();
    if (location.length > 20) location = location.substring(0, 20);
  }

  let narrative = text;
  narrative = narrative.replace(/^[\s\S]*?\{/, '{');
  const objStart = narrative.indexOf('"narrative"');
  if (objStart !== -1) {
    narrative = narrative.substring(objStart + 12).replace(/^[:\s"]+/, '');
  }
  narrative = narrative.replace(/"\s*\}\s*$/, '').trim();
  if (!narrative || narrative.length < 10) {
    narrative = text.replace(/\{[\s\S]*?\}/g, '').trim() || text;
  }

  return {
    scene: { location, narrative: cleanNarrative(narrative) },
    playerState: { health: 100, energy: 85, reputation: 0, inventory: [], cultivationLevel: '炼气期', currentYear: 1287, currentAge: 20, maxLifespan: 100 },
  };
};

const completePlayerState = (ps: any): PlayerState => {
  const defaults: PlayerState = {
    health: 100, energy: 100, reputation: 0, inventory: [],
    cultivationLevel: '炼气期', currentYear: 1287, currentAge: 20, maxLifespan: 100,
  };
  if (!ps || typeof ps !== 'object') return defaults;

  const result = { ...defaults };
  
  if (typeof ps.health === 'number' && ps.health >= 0 && ps.health <= 100) result.health = Math.round(ps.health);
  if (typeof ps.energy === 'number' && ps.energy >= 0 && ps.energy <= 100) result.energy = Math.round(ps.energy);
  if (typeof ps.reputation === 'number' && ps.reputation >= 0 && ps.reputation <= 100) result.reputation = Math.round(ps.reputation);
  if (Array.isArray(ps.inventory)) result.inventory = ps.inventory.filter((i: any) => typeof i === 'string');
  if (typeof ps.cultivationLevel === 'string' && ps.cultivationLevel.trim()) result.cultivationLevel = ps.cultivationLevel.trim();
  if (typeof ps.currentYear === 'number' && ps.currentYear > 0) result.currentYear = Math.round(ps.currentYear);
  if (typeof ps.currentAge === 'number' && ps.currentAge > 0) result.currentAge = Math.round(ps.currentAge);
  if (typeof ps.maxLifespan === 'number' && ps.maxLifespan > 0) result.maxLifespan = Math.round(ps.maxLifespan);

  return result;
};

export type NarrativeStreamCallback = (partialNarrative: string) => void;

const parseAssistantToGameResult = (raw: string, currentLocation?: string): any => {
  const cleaned = cleanContent(raw);
  const parsed = extractValidJson(cleaned);
  if (parsed) {
    return {
      scene: { location: parsed.location, narrative: cleanNarrative(parsed.narrative) },
      playerState: completePlayerState(parsed.playerState),
    };
  }
  console.warn('JSON解析失败，使用回退模式');
  return buildFallbackResponse(cleaned, currentLocation);
};

export const callSiliconFlowAPI = async (
  prompt: string,
  apiKey: string,
  customApiUrl: string,
  model: string,
  currentLocation?: string,
  action?: string,
  onNarrativePreview?: NarrativeStreamCallback,
  userAbortSignal?: AbortSignal
): Promise<any> => {
  if (!customApiUrl || !apiKey) {
    console.warn('API未配置，使用演示模式');
    if (onNarrativePreview) {
      return mockResponseWithStreaming(action, currentLocation, onNarrativePreview, userAbortSignal);
    }
    return generateMockResponse(action || '开始游戏', currentLocation);
  }

  console.log('正在调用API:', customApiUrl, '模型:', model, onNarrativePreview ? '(流式)' : '(整包)');

  const maxTokens = Math.min(8192, Math.max(512, useConfigStore.getState().maxTokens));
  const messagesBody = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.55,
  };

  if (onNarrativePreview) {
    let accumulated = '';
    try {
      const fullAssistant = await fetchChatCompletionStream(
        customApiUrl,
        apiKey,
        messagesBody,
        DEFAULT_CHAT_TIMEOUT_MS,
        (delta) => {
          accumulated += delta;
          onNarrativePreview(extractPartialNarrativeFromJsonBuffer(accumulated));
        },
        userAbortSignal
      );
      if (!fullAssistant?.trim()) throw new Error('API流式响应内容为空');
      return parseAssistantToGameResult(fullAssistant, currentLocation);
    } catch (error: unknown) {
      if (error instanceof UserStreamAbortError) throw error;
      console.warn('流式请求失败，回退整包请求:', error);
      try {
        return await callSiliconFlowAPI(
          prompt,
          apiKey,
          customApiUrl,
          model,
          currentLocation,
          action,
          undefined,
          undefined
        );
      } catch {
        console.error('整包重试仍失败，使用演示模式');
        return generateMockResponse(action || '开始游戏', currentLocation);
      }
    }
  }

  try {
    const response = await fetchWithTimeout(
      customApiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(messagesBody),
      },
      DEFAULT_CHAT_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API请求失败: ${response.status} - ${errorText}`);
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('API响应长度:', content?.length);
    console.log('内容预览:', content?.substring(0, 400));

    if (!content) {
      throw new Error('API响应内容为空');
    }

    return parseAssistantToGameResult(content, currentLocation);
  } catch (error: unknown) {
    const name = error instanceof Error ? (error as Error & { name?: string }).name : '';
    const msg = error instanceof Error ? error.message : String(error);
    if (name === 'AbortError' || /aborted|AbortError/i.test(msg)) {
      throw new Error(
        `API 请求超时（超过 ${DEFAULT_CHAT_TIMEOUT_MS / 1000} 秒未返回）。可尝试：检查网络、更换更快模型，或在设置中调低「最大 Token」以加快生成。`
      );
    }
    console.error('API调用失败，使用演示模式:', error);
    return generateMockResponse(action || '开始游戏', currentLocation);
  }
};

export const generateCharacterInfo = async (
  theme: ThemeType,
  apiKey: string,
  customApiUrl: string,
  model: string
): Promise<CharacterInfo | null> => {
  const prompt = `
${CHARACTER_GEN_CONTEXT}

请为玩家生成一个角色信息，输出格式为JSON：
- "name": 姓名
- "age": 16-25的整数
- "gender": "male"或"female"
- "race": "human"、"demon"、"animal"或"custom"
- "appearance": 外貌身材描述（30字以内）
- "perspective": "first"、"second"或"third"
- "playerInfo": 自身性格描述（50字以内）
- "background": 背景故事（不超过200字）
仅输出JSON，不要其他内容。`.trim();

  const baseUrl = customApiUrl || 'https://api.siliconflow.cn/v1/chat/completions';

  try {
    const response = await fetchWithTimeout(
      baseUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.8,
        }),
      },
      Math.min(60_000, DEFAULT_CHAT_TIMEOUT_MS)
    );

    if (!response.ok) return generateMockCharacterInfo();

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return generateMockCharacterInfo();

    const cleaned = cleanContent(content);
    const parsed = extractValidJson(cleaned) || tryParseJson(cleaned);
    if (!parsed) return generateMockCharacterInfo();

    if (parsed.background?.length > 200) parsed.background = parsed.background.substring(0, 200);
    if (!parsed.gender || (parsed.gender !== 'male' && parsed.gender !== 'female')) parsed.gender = 'male';
    const validRaces: RaceType[] = ['human', 'demon', 'animal', 'custom'];
    if (!parsed.race || !validRaces.includes(parsed.race)) parsed.race = 'human';
    if (!parsed.appearance) parsed.appearance = '';
    const validPerspectives: PerspectiveType[] = ['first', 'second', 'third'];
    if (!parsed.perspective || !validPerspectives.includes(parsed.perspective)) parsed.perspective = 'first';

    return parsed;
  } catch {
    return generateMockCharacterInfo();
  }
};

const generateMockCharacterInfo = (): CharacterInfo => {
  const names = ['叶凡', '林婉儿', '秦问天', '苏沐橙', '萧战', '柳菲'];
  const genders: GenderType[] = ['male', 'female', 'male', 'female', 'male', 'female'];
  const races: RaceType[] = ['human', 'human', 'demon', 'human', 'human', 'human'];
  const appearances = [
    '身材挺拔，面容俊朗，常负长剑',
    '身姿婀娜，眉目如画，气质出尘',
    '面容冷峻，眼神锐利，周身魔气缭绕',
    '天真烂漫，灵动可爱，眼神清澈',
    '沉稳内敛，不苟言笑，身着朴素道袍',
    '温婉大方，笑容甜美，身着淡雅长裙',
  ];
  const playerInfos = [
    '性格沉稳冷静，善于思考，对朋友忠诚可靠',
    '性格温柔善良，待人和善，内心坚定',
    '性格阴狠手辣，城府极深，野心勃勃',
    '性格活泼开朗，乐于助人，天真无邪',
    '性格沉默寡言，重情重义，不畏强权',
    '性格温婉大方，善解人意，富有同情心',
  ];
  const backgrounds = [
    '出身平凡山村，偶然获得一枚神秘玉佩，踏上修真之路。',
    '宗门世家子弟，从小接受严格训练。家族遭遇变故后，独自踏上复仇之路。',
    '幼时被仇人灭门，身负血海深仇。拜入名师门下，誓要手刃仇人。',
    '天生拥有变异灵根，被青云宗长老看中收为亲传弟子。',
    '流浪剑客，在江湖中历练多年，剑法已臻化境。',
    '从小跟随祖父学习炼丹，年纪轻轻便已是四品丹师。',
  ];

  const idx = Math.floor(Math.random() * names.length);
  return {
    name: names[idx],
    age: 16 + Math.floor(Math.random() * 10),
    gender: genders[idx],
    race: races[idx],
    customRace: '',
    appearance: appearances[idx],
    perspective: 'first',
    playerInfo: playerInfos[idx],
    background: backgrounds[idx],
  };
};

const generateMockResponse = (action: string, currentLocation?: string): any => {
  const locations: Record<string, any> = {
    '天南某处': {
      location: '天南某处——雾隐山林',
      narrative: `雾气如轻纱般缠绕在参天古木之间，天地间一片朦胧。空气中弥漫着湿润的草木清香，混杂着一丝若有若无的灵药气息。远处隐约可见仙鹤在云雾中徘徊，它们的翅膀划过雾气时发出沙沙的轻响，为这片寂静的山林平添一抹灵动。

一位白发老者（仙风道骨，目光深邃如古井）缓步从雾中走出，拂尘在手，道袍轻摆。他打量着你，嘴角浮起一丝若有若无的笑意。\u201c这位小友，看你灵根清澈，骨骼清奇，可愿入我宗门修行？\u201d他声音温和却带着一股不容置疑的威仪。他心中暗想：\u2018此子资质尚可，但心性如何尚需观察\u2019。

旁边一名青年弟子（恭敬侍立，眉目清秀）见状忙上前一步，躬身道：\u201c前辈慧眼如炬，这位公子确实是难得的璞玉。\u201d他又压低声音对你耳语：\u201c前辈乃本宗外门长老，多少人求之不得的机缘，你可要把握住了。\u201d

远处忽有钟声传来，浑厚悠远，震得雾气都微微荡漾。青年弟子神色一凝，急忙拱手道：\u201c宗门召集弟子，前辈，我们该回去了。\u201d老者颔首微笑：\u201c缘分自有天定，小友若有意，三日后可来山门一叙。\u201d话毕，老者和弟子化作两道遁光，消失在茫茫雾海之中，只留下淡淡的灵气余韵在空气中荡漾。`,
    },
  };

  const defaultScene = locations['天南某处'];
  const baseScene = (currentLocation && locations[currentLocation]) ? locations[currentLocation] : defaultScene;

  const plotTwists = [
    '就在这时，远处传来一声清越的剑鸣，一道青色剑光划破天际，显然有高阶修士正在赶来。',
    '你忽然感到一阵心悸，袖中的传讯玉符微微发烫——有人在用神识探查这片区域。',
    '一阵阴风掠过，空气中弥漫起淡淡的血腥气，附近似乎刚刚发生过一场战斗。',
  ];

  const actionResponses: Record<string, any> = {
    '推进剧情': {
      location: baseScene.location,
      narrative: `${baseScene.narrative}\n\n${plotTwists[Math.floor(Math.random() * plotTwists.length)]}`,
    },
    '详细描述当前情景': {
      location: baseScene.location,
      narrative: baseScene.narrative,
    },
  };

  const scene = actionResponses[action] || {
    location: baseScene.location,
    narrative: `你决定${action}。\n\n${baseScene.narrative}`,
  };

  return {
    scene,
    playerState: {
      health: 100,
      energy: 85,
      reputation: 5,
      inventory: ['青钢剑', '筑基丹×2', '辟谷丹×30'],
      cultivationLevel: '炼气期',
      currentYear: 1287,
      currentAge: 20,
      maxLifespan: 100,
    },
  };
};

export const generateInitialScene = (
  theme: ThemeType,
  character: CharacterInfo,
  onNarrativePreview?: NarrativeStreamCallback,
  userAbortSignal?: AbortSignal
): Promise<any> => {
  const config = useConfigStore.getState();
  const prompt = buildUserPrompt(
    theme,
    character,
    '开始游戏，生成完整时间线和初始场景',
    config.maxCharacters,
    config.maxTokens,
    undefined,
    ''
  );
  return callSiliconFlowAPI(
    prompt,
    config.apiKey,
    config.customApiUrl,
    config.model,
    undefined,
    '开始游戏',
    onNarrativePreview,
    userAbortSignal
  );
};

export const processPlayerAction = (
  theme: ThemeType,
  character: CharacterInfo,
  action: string,
  currentLocation?: string,
  recentMessages?: Array<{ type: string; content: string }>,
  anchorPlayerState?: PlayerState,
  onNarrativePreview?: NarrativeStreamCallback,
  userAbortSignal?: AbortSignal
): Promise<any> => {
  const config = useConfigStore.getState();
  const historyText =
    recentMessages && recentMessages.length > 0
      ? formatRecentMessagesForPrompt(recentMessages)
      : '';
  const anchorText =
    anchorPlayerState != null
      ? `【当前界面状态 - 须合理延续，禁止无故重置】\n${formatAnchorStateForPrompt(currentLocation, anchorPlayerState)}`
      : '';
  const mergedHistory = [anchorText, historyText].filter((s) => s.trim() !== '').join('\n\n');
  const prompt = buildUserPrompt(
    theme,
    character,
    action,
    config.maxCharacters,
    config.maxTokens,
    currentLocation,
    mergedHistory,
    'continuation'
  );
  return callSiliconFlowAPI(
    prompt,
    config.apiKey,
    config.customApiUrl,
    config.model,
    currentLocation,
    action,
    onNarrativePreview,
    userAbortSignal
  );
};

export const generateAICharacterInfo = (
  theme: ThemeType
): Promise<CharacterInfo | null> => {
  const config = useConfigStore.getState();
  return generateCharacterInfo(theme, config.apiKey, config.customApiUrl, config.model);
};

export const compressConversation = async (
  messages: Array<{ type: string; content: string }>
): Promise<string> => {
  const config = useConfigStore.getState();

  if (!config.customApiUrl || !config.apiKey) {
    return buildFallbackSummary(messages);
  }

  const conversationText = messages.map((m) => {
    const role = m.type === 'player' ? '玩家' : '系统';
    return `${role}：${m.content}`;
  }).join('\n\n');

  const prompt = `你是一个游戏对话摘要助手。请将以下游戏对话记录精简为一段完整的摘要，要求：
1. 保留所有重要剧情节点和事件
2. 保留所有NPC的姓名、关系和当前态度
3. 保留玩家当前的目标和任务
4. 保留获得或失去的重要物品
5. 保留当前所在地点和处境
6. 摘要应当连贯流畅，便于后续AI继续推进剧情
7. 摘要长度控制在500字以内

游戏对话记录：
${conversationText}

请直接输出摘要内容，不要输出其他任何内容。`;

  const summaryMaxTokens = Math.min(2000, Math.max(400, config.maxTokens));

  try {
    const response = await fetchWithTimeout(
      config.customApiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: summaryMaxTokens,
          temperature: 0.3,
        }),
      },
      Math.min(90_000, DEFAULT_CHAT_TIMEOUT_MS)
    );

    if (!response.ok) {
      return buildFallbackSummary(messages);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content && content.trim().length > 20) {
      return content.trim();
    }
    return buildFallbackSummary(messages);
  } catch {
    return buildFallbackSummary(messages);
  }
};

const buildFallbackSummary = (messages: Array<{ type: string; content: string }>): string => {
  return messages.map((m) => {
    const role = m.type === 'player' ? '玩家' : '系统';
    return `${role}：${m.content.substring(0, 80)}...`;
  }).join('\n');
};