import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/app'
import { setupAuthInterceptors } from './features/auth/auth-interceptors'
import { restoreSession } from './features/auth/use-auth'
import { apiClient } from './lib/api-client'

setupAuthInterceptors(apiClient)
void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
