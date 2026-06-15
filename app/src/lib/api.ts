/**
 * 前端 API 服务层 — 统一的后端接口封装。
 */

const API_BASE = 'http://localhost:7778/api/v1';

// ─── 通用 fetch 封装 ───

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API ${resp.status}: ${errText}`);
  }
  return resp.json();
}

// ─── Projects API ───

export interface ProjectData {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  episodes: number;
  current_episode: number;
  progress: number;
  skill_id: string;
  skill_name: string;
  created_at: string;
  updated_at: string;
}

export const getProjects = (params?: { type?: string; status?: string }) => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return request<ProjectData[]>(`/projects${query ? '?' + query : ''}`);
};

export const createProject = (data: {
  name: string;
  type?: string;
  description?: string;
  episodes?: number;
  skill_id?: string;
  skill_name?: string;
}) => request<ProjectData>('/projects', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getProject = (id: string) => request<ProjectData>(`/projects/${id}`);

export const updateProject = (id: string, data: Partial<{
  name: string;
  type: string;
  status: string;
  description: string;
  episodes: number;
  current_episode: number;
  progress: number;
  skill_id: string;
  skill_name: string;
}>) => request<ProjectData>(`/projects/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteProject = (id: string) => request<{ message: string }>(`/projects/${id}`, {
  method: 'DELETE',
});

// ─── Scripts API ───

export interface ScriptBlockData {
  id?: string;
  type: string;
  content: string;
  sort_order?: number;
}

export interface SceneData {
  id?: string;
  number?: number;
  title: string;
  location?: string;
  time_tag?: string;
  summary?: string;
  blocks?: ScriptBlockData[];
}

export interface EpisodeData {
  id?: string;
  number: number;
  title: string;
  scenes?: SceneData[];
}

export interface ScriptData {
  id: string;
  project_id: string;
  title: string;
  episodes: EpisodeData[];
  created_at: string;
  updated_at: string;
}

export const getScripts = (projectId?: string) => {
  const qs = projectId ? `?project_id=${projectId}` : '';
  return request<ScriptData[]>(`/scripts${qs}`);
};

export const createScript = (data: {
  project_id?: string;
  title: string;
  episodes?: EpisodeData[];
}) => request<ScriptData>('/scripts', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getScript = (id: string) => request<ScriptData>(`/scripts/${id}`);

export const updateScript = (id: string, data: {
  title: string;
  episodes?: EpisodeData[];
}) => request<ScriptData>(`/scripts/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteScript = (id: string) => request<{ message: string }>(`/scripts/${id}`, {
  method: 'DELETE',
});

// ─── Characters API ───

export interface CharacterAsset {
  id?: string;
  type?: string;
  name?: string;
  thumbnail?: string;
}

export interface CharacterRelationship {
  target_character_id?: string;
  target_name?: string;
  relation?: string;
}

export interface CharacterData {
  id: string;
  project_id: string;
  name: string;
  role: string;
  gender: string;
  age: number;
  description: string;
  personality: string;
  personality_traits: string[];
  appearance: string;
  costume: string;
  background: string;
  special_setting: string;
  avatar_color: string;
  avatar_url: string;
  has_generated_image: boolean;
  assets: CharacterAsset[];
  relationships: CharacterRelationship[];
  scenes: string[];
  created_at: string;
  updated_at: string;
}

export const getCharacters = (projectId?: string) => {
  const qs = projectId ? `?project_id=${projectId}` : '';
  return request<CharacterData[]>(`/characters${qs}`);
};

export const createCharacter = (data: {
  project_id?: string;
  name: string;
  role?: string;
  gender?: string;
  age?: number;
  description?: string;
  personality?: string;
  personality_traits?: string[];
  appearance?: string;
  costume?: string;
  background?: string;
  special_setting?: string;
  avatar_color?: string;
  avatar_url?: string;
  has_generated_image?: boolean;
  assets?: CharacterAsset[];
  relationships?: CharacterRelationship[];
  scenes?: string[];
}) => request<CharacterData>('/characters', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getCharacter = (id: string) => request<CharacterData>(`/characters/${id}`);

export const updateCharacter = (id: string, data: Partial<{
  name: string;
  role: string;
  gender: string;
  age: number;
  description: string;
  personality: string;
  personality_traits: string[];
  appearance: string;
  costume: string;
  background: string;
  special_setting: string;
  avatar_color: string;
  avatar_url: string;
  has_generated_image: boolean;
  assets: CharacterAsset[];
  relationships: CharacterRelationship[];
  scenes: string[];
}>) => request<CharacterData>(`/characters/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteCharacter = (id: string) => request<{ message: string }>(`/characters/${id}`, {
  method: 'DELETE',
});

// ─── Storyboard API ───

export interface ShotData {
  id: string;
  project_id: string;
  shot_number: number;
  shot_type: string;
  duration: number;
  status: string;
  description: string;
  camera_movement: string;
  composition: string;
  lighting: string;
  character_action: string;
  dialogue: string;
  scene_ref: string;
  characters: string[];
  created_at: string;
  updated_at: string;
}

export const getShots = (projectId?: string) => {
  const qs = projectId ? `?project_id=${projectId}` : '';
  return request<ShotData[]>(`/storyboards${qs}`);
};

export const createShot = (data: {
  project_id?: string;
  shot_number?: number;
  shot_type?: string;
  duration?: number;
  status?: string;
  description?: string;
  camera_movement?: string;
  composition?: string;
  lighting?: string;
  character_action?: string;
  dialogue?: string;
  scene_ref?: string;
  characters?: string[];
}) => request<ShotData>('/storyboards', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const createShotsBatch = (shots: Parameters<typeof createShot>[0][]) =>
  request<ShotData[]>('/storyboards/batch', {
    method: 'POST',
    body: JSON.stringify(shots),
  });

export const getShot = (id: string) => request<ShotData>(`/storyboards/${id}`);

export const updateShot = (id: string, data: Partial<{
  shot_number: number;
  shot_type: string;
  duration: number;
  status: string;
  description: string;
  camera_movement: string;
  composition: string;
  lighting: string;
  character_action: string;
  dialogue: string;
  scene_ref: string;
  characters: string[];
}>) => request<ShotData>(`/storyboards/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteShot = (id: string) => request<{ message: string }>(`/storyboards/${id}`, {
  method: 'DELETE',
});

// ─── Pipeline API ───

export const savePipelineScript = (data: {
  project_id?: string;
  title: string;
  episodes: { number: number; title: string; scenes: { title: string; summary?: string; location?: string; time_tag?: string }[] }[];
}) => request<ScriptData>('/pipeline/save-script', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const savePipelineCharacters = (project_id: string, characters: {
  name: string;
  role?: string;
  description?: string;
  avatar_color?: string;
}[]) => request<CharacterData[]>('/pipeline/save-characters', {
  method: 'POST',
  body: JSON.stringify({ project_id, characters }),
});

// ─── Chat Stream API (SSE) ───

export interface ChatStreamChunk {
  type: 'thinking' | 'content' | 'error' | 'done';
  data: string;
}

/**
 * SSE 流式 AI 对话。
 * @param messages 对话消息列表
 * @param onChunk 收到 chunk 时的回调
 * @param model 模型名称
 */
export async function chatStream(
  messages: { role: string; content: string }[],
  onChunk: (chunk: ChatStreamChunk) => void,
  model: string = 'mimo',
): Promise<void> {
  const resp = await fetch(`${API_BASE}/pipeline/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, stream: true }),
  });

  if (!resp.ok) {
    throw new Error(`Chat stream ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No readable stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const chunk = JSON.parse(line.slice(6)) as ChatStreamChunk;
          onChunk(chunk);
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

// ─── SKILL API ───

export interface SkillParameterData {
  id: string;
  name: string;
  type: string;
  value: string;
  min_val: number;
  max_val: number;
  step: number;
  options: string[];
  default_value: string;
}

export interface SkillReviewData {
  id: string;
  user_name: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SkillData {
  id: string;
  name: string;
  description: string;
  detailed_description: string;
  category: string;
  style: string;
  tags: string[];
  cover_image: string;
  version: string;
  author_name: string;
  author_avatar: string;
  download_count: number;
  rating: number;
  review_count: number;
  is_official: boolean;
  install_status: string;
  usage_instructions: string;
  created_at: string | null;
  updated_at: string | null;
  parameters: SkillParameterData[];
  reviews: SkillReviewData[];
}

export const getSkills = (params?: { category?: string; style?: string }) => {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.style) qs.set('style', params.style);
  const query = qs.toString();
  return request<SkillData[]>(`/skills${query ? '?' + query : ''}`);
};

export const getSkill = (id: string) => request<SkillData>(`/skills/${id}`);

export const createSkill = (data: {
  name: string;
  description?: string;
  detailed_description?: string;
  category?: string;
  style?: string;
  tags?: string[];
  cover_image?: string;
  version?: string;
  author_name?: string;
  author_avatar?: string;
  is_official?: boolean;
  usage_instructions?: string;
}) => request<SkillData>('/skills', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateSkill = (id: string, data: Partial<{
  name: string;
  description: string;
  detailed_description: string;
  category: string;
  style: string;
  tags: string[];
  cover_image: string;
  version: string;
  author_name: string;
  author_avatar: string;
  is_official: boolean;
  usage_instructions: string;
}>) => request<SkillData>(`/skills/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteSkill = (id: string) => request<{ message: string }>(`/skills/${id}`, {
  method: 'DELETE',
});

export const installSkill = (id: string) => request<{ message: string }>(`/skills/${id}/install`, {
  method: 'POST',
});

export const uninstallSkill = (id: string) => request<{ message: string }>(`/skills/${id}/uninstall`, {
  method: 'POST',
});

export const rateSkill = (id: string, rating: number, comment?: string) =>
  request<{ message: string }>(`/skills/${id}/rate?rating=${rating}${comment ? '&comment=' + encodeURIComponent(comment) : ''}`, {
    method: 'POST',
  });

// ─── Generation API ───

export interface GenerationTaskData {
  task_id: string;
  status: string;
  stage: string;
  progress: number;
  detail: string;
  result: Record<string, unknown> | null;
  created_at: string;
}

export const submitGenerationTask = (data: {
  project_id: string;
  stage: string;
  skill_id?: string;
  creative_input?: string;
}) => request<GenerationTaskData>('/generation/submit', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getGenerationTask = (taskId: string) =>
  request<GenerationTaskData>(`/generation/${taskId}`);

export const cancelGenerationTask = (taskId: string) =>
  request<{ message: string }>(`/generation/${taskId}`, {
    method: 'DELETE',
  });
