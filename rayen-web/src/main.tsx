import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { registerOffline } from './lib/offline';

registerOffline();

const host = document.getElementById('root');
if (!host) throw new Error('#root is missing from grid.html');

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
