import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initialize i18n before rendering — must be imported before App
import './i18n'
import { applyLanguage, getStoredLanguage } from './i18n'
import App from './App'

// Apply persisted language to DOM immediately (prevents flash)
applyLanguage(getStoredLanguage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
