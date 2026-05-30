import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
// Initialize i18n before rendering — must be imported before App
import './i18n'
import { applyLanguage, getStoredLanguage } from './i18n'
import App from './App'
import { getQueryClient } from '@/lib/queryClient'

// Apply persisted language to DOM immediately (prevents flash)
applyLanguage(getStoredLanguage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={getQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
