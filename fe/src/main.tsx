import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { PlaneProvider } from './context/PlaneProvider.tsx'
import { PlanesProvider } from './context/PlanesProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlanesProvider>
      <PlaneProvider>
        <App />
      </PlaneProvider>
    </PlanesProvider>
  </StrictMode>,
)
