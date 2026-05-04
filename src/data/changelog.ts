/** 与 `src/prompts/cultivation-v3.1.md` 第十五节「客户端提示词补丁」对应的应用发行说明（首屏「更新」弹窗数据源） */
export const GAME_VERSION = '0.2.3';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  bullets: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.3',
    date: '2026-05-02',
    title: '流式打断与开局重试',
    bullets: [
      '叙事流式生成过程中可「打断并作废本回合」：中止请求、撤销本轮玩家输入并恢复输入框。',
      '开局流式生成可打断；中断后可「重试开局」重新请求初始场景。',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-05-02',
    title: '叙事流式输出',
    bullets: [
      '对局调用 API 时使用 SSE 流式返回，界面随 narrative 生成逐段显示，无需等整段 JSON 结束。',
      '流式不可用或失败时自动回退为整包请求；演示模式同样模拟分段显示。',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-05-02',
    title: '对局 API 速度与超时',
    bullets: [
      '玩家每回合不再上传整份 v3.1 设定正文，仅保留开场首请求全文 + 后续「延续锚点」与对话前情，明显减轻卡顿与转圈过久。',
      '为叙事、摘要、生角请求增加网络超时；超时后界面会收到明确错误提示，而非无限加载。',
      'AI 随机生角改为短上下文，减少一次不必要的超长提示。',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-02',
    title: '存档交互、首页与视觉焕新',
    bullets: [
      '新增游戏首屏：作品介绍、玩法说明与版本更新入口（小窗点击查看完整更新日志）。',
      '存档页三个槽位整卡可点：空槽在此开始新人生；已有存档可选择「读取存档」或「新开游戏覆盖」。',
      '完善存档内容：对话消息带时间戳、可选 NPC 列表字段；对局中绑定当前槽位并支持防抖自动保存。',
      '主题选择、创角、设置与对局界面大范围视觉与排版优化。',
    ],
  },
  {
    version: '0.1.0',
    date: '此前版本',
    title: '基础体验',
    bullets: [
      '修真主题、API 配置、角色创建与 AI 叙事对局。',
      '三槽位本地存档与上下文压缩等基础能力。',
    ],
  },
];

export function formatFullChangelogText(): string {
  return CHANGELOG.map(
    (e) =>
      `【${e.version}】${e.title}（${e.date}）\n${e.bullets.map((b) => `· ${b}`).join('\n')}`
  ).join('\n\n');
}
