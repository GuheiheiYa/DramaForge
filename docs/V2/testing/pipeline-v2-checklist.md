# Pipeline V2 E2E 验收清单

**规格**: [design/pipeline/](../design/pipeline/)  
**关联**: R-063 ~ R-066, R-067 ~ R-070

---

## 1. 环境

- [ ] 后端 7790、Agnes/LLM Key
- [ ] 新建或选定 projectId

---

## 2. 五步自动路径（auto）

- [ ] Step1 剧本 → ScriptEditor 可读
- [ ] Step2 角色包 → 每主角 ≥4 视角 assets
- [ ] Step3 分镜 → storyboard_shots 有行；**未打开** /storyboard
- [ ] Step4 关键帧 → keyframe_url 落库
- [ ] Step5 视频 → timeline_clips media_url
- [ ] Chat pipeline_complete + clip 可播放
- [ ] **未打开** /composer 仍算通过

---

## 3. preview 模式

- [ ] Step4 后 pipeline_completed
- [ ] 无 video generation_tasks

---

## 4. confirm 模式

- [ ] Step1 后 waiting；resume → Step2

---

## 5. 角色与 SKILL

- [ ] render_mode 反映在生图 prompt（日志）
- [ ] 多角色 side/back 与 front 同风格
- [ ] visual_dna 非空

---

## 6. 关键帧策略 R-065

- [ ] 同 scene_ref 多镜色调一致（抽检）
- [ ] 非「纯场景空镜」批量流程

---

## 7. 统一 i2v R-066

- [ ] Pipeline Step5 使用 keyframe_url
- [ ] Storyboard 手动生成视频同路径（有 keyframe 时）

---

## 8. 失败恢复

- [ ] Step5 单镜失败 → retry 该步
- [ ] skip 后继续（若支持）
- [ ] 删项目 → 级联清 pipeline

---

## 9. 切页恢复

- [ ] running 时切 Dashboard → ProgressPanel 可见
- [ ] 回 Chat 面板恢复
- [ ] 刷新 restore localStorage

---

## 10. Deferred

- [ ] audio/compose 占位不导致 V2 失败
