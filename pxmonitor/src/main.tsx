import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NetworkMetricsProvider } from './contexts/NetworkMetricsContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NetworkMetricsProvider>
      <App />
    </NetworkMetricsProvider>
  </React.StrictMode>,
)
