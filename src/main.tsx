import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { installErrorLogging } from './services/errors'
import { installStaleChunkReload } from './lib/staleChunk'

installStaleChunkReload()
installErrorLogging()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)