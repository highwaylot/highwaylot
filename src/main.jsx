import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)

// Prerendered pages ship real HTML in #root (scripts/prerender.mjs) — hydrate
// it; the plain SPA shell (unknown URLs) has an empty root, so render fresh.
const rootEl = document.getElementById('root')
if (rootEl.hasChildNodes()) ReactDOM.hydrateRoot(rootEl, app)
else ReactDOM.createRoot(rootEl).render(app)
