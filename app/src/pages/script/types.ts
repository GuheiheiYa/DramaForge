/** 剧本标记块类型 */
export type ScriptBlockType =
  | 'scene'
  | 'character'
  | 'emotion'
  | 'action'
  | 'sound'
  | 'transition'
  | 'dialogue'
  | 'narration'
  | 'note';

/** 场景元素（角色对话/动作/音效等） */
export interface SceneElement {
  id: string;
  type: 'dialogue' | 'action' | 'sound' | 'transition';
  label: string;
  blockId: string;
}

/** 场景 */
export interface Scene {
  id: string;
  number: number;
  title: string;
  location: string;
  timeTag: string;
  elements: SceneElement[];
  expanded: boolean;
}

/** 集 */
export interface Episode {
  id: string;
  number: number;
  title: string;
  scenes: Scene[];
}

/** 剧本块（编辑器中的段落单元） */
export interface ScriptBlock {
  id: string;
  type: ScriptBlockType;
  content: string;
  sceneId?: string;
}

/** 剧本项目 */
export interface ScriptProject {
  id: string;
  title: string;
  type: string;
  episodes: Episode[];
  currentEpisodeId: string;
}

/** 编辑区状态 */
export interface EditorState {
  blocks: ScriptBlock[];
  selectedBlockId: string | null;
  cursorLine: number;
  cursorColumn: number;
  wordCount: number;
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

/** AI 消息 */
export interface AIMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  suggestions?: string[];
}

/** 语法高亮标记 */
export interface MarkupToken {
  type: ScriptBlockType;
  text: string;
  start: number;
  end: number;
}
