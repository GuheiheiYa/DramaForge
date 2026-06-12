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

// ─── 剧本 API ───

export interface SceneData {
  id: string;
  title: string;
  summary: string;
  location: string;
  time_tag: string;
}

export interface EpisodeData {
  id: string;
  number: number;
  title: string;
  scenes: SceneData[];
}

export interface ScriptData {
  id: string;
  project_id: string;
  title: string;
  episodes: EpisodeData[];
  created_at: string;
  updated_at: string;
}

export interface ScriptCreateRequest {
  project_id?: string;
  title: string;
  episodes: Array<{
    number: number;
    title: string;
    scenes: Array<{
      title: string;
      summary: string;
      location?: string;
      time_tag?: string;
    }>;
  }>;
}

/** 创建剧本。 */
export async function createScript(data: ScriptCreateRequest): Promise<ScriptData> {
  return request<ScriptData>('/scripts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 获取项目剧本。 */
export async function getScript(projectId: string): Promise<ScriptData> {
  return request<ScriptData>(`/scripts/${projectId}`);
}

/** 更新场景。 */
export async function updateScene(sceneId: string, data: { title?: string; summary?: string; location?: string }): Promise<void> {
  const params = new URLSearchParams();
  if (data.title !== undefined) params.set('title', data.title);
  if (data.summary !== undefined) params.set('summary', data.summary);
  if (data.location !== undefined) params.set('location', data.location);
  await request(`/scripts/scenes/${sceneId}?${params}`, { method: 'PUT' });
}

/** 删除剧本。 */
export async function deleteScript(scriptId: string): Promise<void> {
  await request(`/scripts/${scriptId}`, { method: 'DELETE' });
}

// ─── 角色 API ───

export interface CharacterData {
  id: string;
  project_id: string;
  name: string;
  role: string;
  gender: string;
  age: number;
  description: string;
  personality: string;
  appearance: string;
  costume: string;
  background: string;
  special_setting: string;
  avatar_color: string;
  avatar_url: string;
  has_generated_image: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterCreateRequest {
  project_id?: string;
  name: string;
  role?: string;
  gender?: string;
  age?: number;
  description?: string;
  personality?: string;
  appearance?: string;
  costume?: string;
  background?: string;
  special_setting?: string;
  avatar_color?: string;
}

/** 获取角色列表。 */
export async function getCharacters(projectId?: string): Promise<CharacterData[]> {
  const params = projectId ? `?project_id=${projectId}` : '';
  return request<CharacterData[]>(`/characters${params}`);
}

/** 创建角色。 */
export async function createCharacter(data: CharacterCreateRequest): Promise<CharacterData> {
  return request<CharacterData>('/characters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新角色。 */
export async function updateCharacter(id: string, data: CharacterCreateRequest): Promise<CharacterData> {
  return request<CharacterData>(`/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 删除角色。 */
export async function deleteCharacter(id: string): Promise<void> {
  await request(`/characters/${id}`, { method: 'DELETE' });
}

// ─── Pipeline 保存 API ───

/** 保存 Pipeline 提取的剧本。 */
export async function savePipelineScript(data: ScriptCreateRequest): Promise<ScriptData> {
  return request<ScriptData>('/pipeline/save-script', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 保存 Pipeline 提取的角色。 */
export async function savePipelineCharacters(projectId: string, characters: CharacterCreateRequest[]): Promise<CharacterData[]> {
  return request<CharacterData[]>('/pipeline/save-characters', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, characters }),
  });
}
