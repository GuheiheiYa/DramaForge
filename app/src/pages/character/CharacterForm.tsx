import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character, CharacterRelationship } from './types';
import { presetTraits, roleTypeOptions, genderOptions } from './mockData';
import { useToast, MSG } from '@/hooks/useToast';

interface CharacterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  editingCharacter?: Character | null;
  allCharacters: Character[];
}

const emptyCharacter: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  role: '配角',
  gender: '女',
  age: 17,
  description: '',
  personalityTraits: [],
  appearance: '',
  costume: '',
  background: '',
  specialSetting: '',
  assets: [],
  hasGeneratedImage: false,
  relationships: [],
  scenes: [],
};

export default function CharacterForm({ isOpen, onClose, onSave, editingCharacter, allCharacters }: CharacterFormProps) {
  const [form, setForm] = useState<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>(emptyCharacter);
  const [activeSection, setActiveSection] = useState(0);
  const [newTrait, setNewTrait] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [relationshipTarget, setRelationshipTarget] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const traitInputRef = useRef<HTMLInputElement>(null);
  const { success } = useToast();

  useEffect(() => {
    if (editingCharacter) {
      setForm({
        name: editingCharacter.name,
        role: editingCharacter.role,
        gender: editingCharacter.gender,
        age: editingCharacter.age,
        description: editingCharacter.description,
        personalityTraits: [...editingCharacter.personalityTraits],
        appearance: editingCharacter.appearance,
        costume: editingCharacter.costume,
        background: editingCharacter.background,
        specialSetting: editingCharacter.specialSetting,
        assets: editingCharacter.assets,
        hasGeneratedImage: editingCharacter.hasGeneratedImage,
        relationships: [...editingCharacter.relationships],
        scenes: editingCharacter.scenes,
      });
    } else {
      setForm(emptyCharacter);
    }
    setActiveSection(0);
    setErrors({});
    setIsDirty(false);
    setNewTrait('');
    setRelationshipTarget('');
    setRelationshipType('');
  }, [editingCharacter, isOpen]);

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addTrait = (trait: string) => {
    if (trait.trim() && !form.personalityTraits.includes(trait.trim())) {
      updateField('personalityTraits', [...form.personalityTraits, trait.trim()]);
    }
    setNewTrait('');
  };

  const removeTrait = (trait: string) => {
    updateField(
      'personalityTraits',
      form.personalityTraits.filter((t) => t !== trait)
    );
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = '角色名称不能为空';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveSection(0);
      return;
    }
    const now = new Date().toISOString().split('T')[0];
    const character: Character = {
      ...form,
      id: editingCharacter?.id || `c${Date.now()}`,
      createdAt: editingCharacter?.createdAt || now,
      updatedAt: now,
    };
    onSave(character);
    onClose();
  };

  const handleClose = () => {
    if (isDirty && !editingCharacter) {
      if (window.confirm(MSG.dirtyConfirm)) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const addRelationship = () => {
    if (!relationshipTarget || !relationshipType) return;
    const target = allCharacters.find((c) => c.id === relationshipTarget);
    if (!target) return;
    const newRel: CharacterRelationship = {
      targetCharacterId: target.id,
      targetName: target.name,
      relation: relationshipType,
    };
    updateField('relationships', [...form.relationships, newRel]);
    setRelationshipTarget('');
    setRelationshipType('');
  };

  const removeRelationship = (index: number) => {
    updateField(
      'relationships',
      form.relationships.filter((_, i) => i !== index)
    );
  };

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      success(MSG.imageUploaded);
    }
  }, [success]);

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleImageDragLeave = () => {
    setIsDragOver(false);
  };

  const handleImageUpload = () => {
    success(MSG.imageUploaded);
  };

  const sections = [
    { title: '基本信息', required: true },
    { title: '性格设定', required: false },
    { title: '外貌描述', required: false },
    { title: '服装设定', required: false },
    { title: '角色关系', required: false },
    { title: '备注', required: false },
  ];

  const relationshipTypeOptions = ['朋友', '恋人', '家人', '师生', '同事', '敌对', '暗恋', '崇拜'];

  // Filter out current character from relationship options
  const availableForRelationship = allCharacters.filter(
    (c) => c.id !== editingCharacter?.id
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="relative w-[640px] max-h-[90vh] bg-white rounded-xl shadow-[0_8px_32px_rgba(30,28,26,0.12)] overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#DEDBD8] flex items-center justify-between shrink-0">
              <h3 className="text-h3 text-[#383431]">
                {editingCharacter ? '编辑角色' : '新建角色'}
              </h3>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="px-6 pt-4 flex gap-1 overflow-x-auto shrink-0 border-b border-[#DEDBD8]">
              {sections.map((section, i) => (
                <button
                  key={section.title}
                  onClick={() => setActiveSection(i)}
                  className={`px-3 py-2 text-[13px] font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                    activeSection === i
                      ? 'text-[#A8835F] bg-[#FBF7F4] border-b-2 border-[#A8835F]'
                      : 'text-[#8B847E] hover:text-[#6E6862] hover:bg-[#F8F7F6]'
                  }`}
                >
                  {section.title}
                  {section.required && <span className="text-[#B85C50] ml-0.5">*</span>}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <AnimatePresence mode="wait">
                {/* Section 1: Basic Info */}
                {activeSection === 0 && (
                  <motion.div
                    key="section0"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Image Upload */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">角色形象</label>
                      <div
                        onDrop={handleImageDrop}
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onClick={handleImageUpload}
                        className={cn(
                          'w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                          isDragOver
                            ? 'border-[#A8835F] bg-[#FBF7F4]'
                            : 'border-[#DEDBD8] bg-[#F8F7F6] hover:border-[#EAD8C8] hover:bg-[#FBF7F4]'
                        )}
                      >
                        <Upload size={20} className="text-[#A8A39E] mb-1" />
                        <span className="text-[12px] text-[#A8A39E]">
                          {isDragOver ? '释放以上传' : '拖拽图片到此处，或点击上传'}
                        </span>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">
                        角色名称 <span className="text-[#B85C50]">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="输入角色名称..."
                        className={cn(
                          'w-full h-10 px-3 bg-[#F8F7F6] border rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all',
                          errors.name ? 'border-[#B85C50]' : 'border-[#DEDBD8]'
                        )}
                      />
                      {errors.name && <span className="text-[11px] text-[#B85C50] mt-1">{errors.name}</span>}
                    </div>

                    {/* Role Type - Visual Cards */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">角色类型</label>
                      <div className="flex gap-3">
                        {roleTypeOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateField('role', opt.value)}
                            className={cn(
                              'flex-1 py-2.5 px-4 rounded-lg border text-[14px] font-medium transition-all',
                              form.role === opt.value
                                ? 'border-[#C4A07F] bg-[#FBF7F4] text-[#755235] shadow-sm'
                                : 'border-[#DEDBD8] text-[#524D48] hover:border-[#EAD8C8]'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gender - Visual Cards */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">性别</label>
                        <div className="flex gap-2">
                          {genderOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateField('gender', opt.value)}
                              className={cn(
                                'flex-1 py-2 rounded-lg border text-[14px] transition-all',
                                form.gender === opt.value
                                  ? 'border-[#C4A07F] bg-[#FBF7F4] text-[#755235] shadow-sm'
                                  : 'border-[#DEDBD8] text-[#524D48] hover:border-[#EAD8C8]'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="w-32">
                        <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">年龄</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.age}
                            onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
                            className="w-full h-10 px-3 pr-8 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A8A39E]">岁</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">角色简介</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="描述角色的基本信息..."
                        rows={3}
                        className="w-full px-3 py-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Section 2: Personality */}
                {activeSection === 1 && (
                  <motion.div
                    key="section1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Personality Tags */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">性格标签</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <AnimatePresence>
                          {form.personalityTraits.map((trait) => (
                            <motion.span
                              key={trait}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FBF7F4] text-[#8E6A48] rounded-full text-[13px]"
                            >
                              {trait}
                              <button
                                onClick={() => removeTrait(trait)}
                                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#F5EDE6] transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={traitInputRef}
                          type="text"
                          value={newTrait}
                          onChange={(e) => setNewTrait(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addTrait(newTrait); }
                          }}
                          placeholder="输入性格标签，按回车添加..."
                          className="flex-1 h-9 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-md text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] transition-all"
                        />
                        <button
                          onClick={() => addTrait(newTrait)}
                          className="h-9 px-3 bg-[#A8835F] text-white rounded-md text-[13px] hover:bg-[#8E6A48] transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    </div>

                    {/* Preset Traits */}
                    <div>
                      <label className="block text-[13px] font-medium text-[#A8A39E] mb-2">快速选择</label>
                      <div className="flex flex-wrap gap-1.5">
                        {presetTraits.map((trait) => {
                          const isSelected = form.personalityTraits.includes(trait);
                          return (
                            <button
                              key={trait}
                              onClick={() => {
                                if (isSelected) removeTrait(trait);
                                else addTrait(trait);
                              }}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[12px] transition-all',
                                isSelected
                                  ? 'bg-[#FBF7F4] text-[#8E6A48] border border-[#C4A07F]'
                                  : 'bg-[#F8F7F6] text-[#6E6862] border border-[#DEDBD8] hover:border-[#EAD8C8]'
                              )}
                            >
                              {trait}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Background */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">背景故事</label>
                      <textarea
                        value={form.background}
                        onChange={(e) => updateField('background', e.target.value)}
                        placeholder="角色的过去和成长经历..."
                        rows={4}
                        className="w-full px-3 py-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Section 3: Appearance */}
                {activeSection === 2 && (
                  <motion.div
                    key="section2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">外貌特征</label>
                      <textarea
                        value={form.appearance}
                        onChange={(e) => updateField('appearance', e.target.value)}
                        placeholder="描述角色的发型、眼睛、身材等外貌特征..."
                        rows={5}
                        className="w-full px-3 py-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Section 4: Costume */}
                {activeSection === 3 && (
                  <motion.div
                    key="section3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">服装设定</label>
                      <textarea
                        value={form.costume}
                        onChange={(e) => updateField('costume', e.target.value)}
                        placeholder="描述角色通常穿着的服装风格..."
                        rows={5}
                        className="w-full px-3 py-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Section 5: Relationships */}
                {activeSection === 4 && (
                  <motion.div
                    key="section4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Add Relationship */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">添加关系</label>
                      <div className="flex gap-2">
                        <select
                          value={relationshipTarget}
                          onChange={(e) => setRelationshipTarget(e.target.value)}
                          className="flex-1 h-9 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-md text-[14px] text-[#383431] outline-none focus:border-[#D9BFA8]"
                        >
                          <option value="">选择角色...</option>
                          {availableForRelationship.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}（{c.role}）</option>
                          ))}
                        </select>
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value)}
                          className="w-28 h-9 px-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-md text-[14px] text-[#383431] outline-none focus:border-[#D9BFA8]"
                        >
                          <option value="">关系...</option>
                          {relationshipTypeOptions.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={addRelationship}
                          disabled={!relationshipTarget || !relationshipType}
                          className={cn(
                            'h-9 px-3 rounded-md text-[13px] transition-colors',
                            relationshipTarget && relationshipType
                              ? 'bg-[#A8835F] text-white hover:bg-[#8E6A48]'
                              : 'bg-[#EFEDEB] text-[#C5C1BC] cursor-not-allowed'
                          )}
                        >
                          添加
                        </button>
                      </div>
                    </div>

                    {/* Relationships List */}
                    <div className="space-y-2">
                      <AnimatePresence>
                        {form.relationships.map((rel, i) => (
                          <motion.div
                            key={`${rel.targetCharacterId}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center justify-between p-3 bg-[#F8F7F6] rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#EAD8C8] flex items-center justify-center text-[13px] text-[#8E6A48] shrink-0">
                                {rel.targetName[0]}
                              </div>
                              <div>
                                <span className="text-[14px] font-medium text-[#383431]">{rel.targetName}</span>
                                <span className="text-[13px] text-[#A8A39E] mx-2">→</span>
                                <span className="text-[13px] text-[#6E6862]">{rel.relation}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeRelationship(i)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#FDF2F0] text-[#A8A39E] hover:text-[#B85C50] transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {form.relationships.length === 0 && (
                        <p className="text-[13px] text-[#A8A39E] text-center py-6">暂无角色关系，请添加</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Section 6: Notes */}
                {activeSection === 5 && (
                  <motion.div
                    key="section5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">特殊设定</label>
                      <textarea
                        value={form.specialSetting}
                        onChange={(e) => updateField('specialSetting', e.target.value)}
                        placeholder="角色的特殊能力、习惯或其他备注..."
                        rows={5}
                        className="w-full px-3 py-2 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                      />
                    </div>

                    {/* Image upload for assets */}
                    <div>
                      <label className="block text-[14px] font-medium text-[#524D48] mb-1.5">资产上传</label>
                      <div
                        onDrop={handleImageDrop}
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onClick={handleImageUpload}
                        className={cn(
                          'w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                          isDragOver
                            ? 'border-[#A8835F] bg-[#FBF7F4]'
                            : 'border-[#DEDBD8] bg-[#F8F7F6] hover:border-[#EAD8C8] hover:bg-[#FBF7F4]'
                        )}
                      >
                        <Upload size={24} className="text-[#A8A39E] mb-2" />
                        <span className="text-[13px] text-[#A8A39E]">
                          {isDragOver ? '释放以上传资产' : '拖拽图片到此处，或点击上传角色资产'}
                        </span>
                        <span className="text-[11px] text-[#C5C1BC] mt-1">支持立绘、表情、服装、动作</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-[#DEDBD8] flex items-center justify-between">
              <button
                onClick={handleClose}
                className="h-9 px-4 rounded-lg border border-[#DEDBD8] text-[14px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors"
              >
                取消
              </button>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-[12px] text-[#C49A3C]">有未保存的更改</span>
                )}
                <button
                  onClick={handleSave}
                  className="h-9 px-6 rounded-lg bg-[#A8835F] text-white text-[14px] font-medium hover:bg-[#8E6A48] active:scale-[0.98] transition-all"
                >
                  {editingCharacter ? '保存更改' : '创建角色'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
