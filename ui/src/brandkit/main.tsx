import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './brandkit.css'
import BrandKit from './BrandKit'

createRoot(document.getElementById('root')!).render(<StrictMode><BrandKit /></StrictMode>)
