import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Remove ALL default Vite CSS — Alsad handles its own styles
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)