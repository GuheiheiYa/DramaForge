export type CharacterRole = '主角' | '配角' | '龙套';
export type CharacterGender = '男' | '女' | '其他';
export type AssetType = '立绘' | '表情' | '服装' | '动作';

export interface CharacterAsset {
  id: string;
  type: AssetType;
  name: string;
  thumbnail: string;
}

export interface CharacterTrait {
  label: string;
}

export interface CharacterRelationship {
  targetCharacterId: string;
  targetName: string;
  relation: string;
}

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  gender: CharacterGender;
  age: number;
  description: string;
  personalityTraits: string[];
  appearance: string;
  costume: string;
  background: string;
  specialSetting: string;
  assets: CharacterAsset[];
  hasGeneratedImage: boolean;
  avatarUrl?: string;
  relationships: CharacterRelationship[];
  scenes: string[];
  createdAt: string;
  updatedAt: string;
}
