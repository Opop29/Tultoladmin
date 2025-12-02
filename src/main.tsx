import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Handle GitHub Pages SPA redirect
if (window.location.search.startsWith('/?')) {
  const path = window.location.search.slice(2).replace(/~and~/g, '&');
  window.history.replaceState(null, '', path);
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);