import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ToastProvider from '@/components/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <ToastProvider />
    <App />
  </HashRouter>,
)
