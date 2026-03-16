import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </BrowserRouter>
  </StrictMode>
)
