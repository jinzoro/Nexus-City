import { createRoot } from 'react-dom/client'
import App from './App'
import { useCityStore } from './state/useCityStore'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)

// Dev console hook (stripped from production builds by the env guard below).
if (import.meta.env.DEV) {
  ;(window as unknown as { __nexus: typeof useCityStore }).__nexus = useCityStore
}
