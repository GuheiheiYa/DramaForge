import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import ScriptEditor from '@/pages/ScriptEditor'
import CharacterManager from '@/pages/CharacterManager'
import StoryboardWorkbench from '@/pages/StoryboardWorkbench'
import ComposerStudio from '@/pages/ComposerStudio'
import SkillMarket from '@/pages/SkillMarket'
import Chat from '@/pages/Chat'
import AssetLibrary from '@/pages/AssetLibrary'
import GenerationHistory from '@/pages/GenerationHistory'
import CostStatistics from '@/pages/CostStatistics'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/script" element={<ScriptEditor />} />
        <Route path="/characters" element={<CharacterManager />} />
        <Route path="/storyboard" element={<StoryboardWorkbench />} />
        <Route path="/composer" element={<ComposerStudio />} />
        <Route path="/skills" element={<SkillMarket />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/assets" element={<AssetLibrary />} />
        <Route path="/history" element={<GenerationHistory />} />
        <Route path="/cost" element={<CostStatistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
