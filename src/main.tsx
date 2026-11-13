import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './a11y.css'
import './hangar-tech-buttons.css'
import './hangar-polish.css'
import './hangar-neo.css'
import App from './App.tsx'
import { initPrefs } from './lib/prefs'
import { initHangarFx } from './lib/hangarFx'

// La personalización guardada se aplica antes de pintar, para que no haya parpadeo.
initPrefs()
initHangarFx()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
