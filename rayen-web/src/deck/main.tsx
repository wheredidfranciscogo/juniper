/**
 * Entry point for the deck — the app, served at /.
 *
 * Separate from src/main.tsx on purpose: the grid app keeps its route (/grid) and its
 * tests, and this page cannot affect them. No StrictMode — its double effect invocation in dev
 * would start two of every GSAP timeline.
 *
 * IT IS THE SAME GARDEN, THOUGH. Both entry points mount the same StoreProvider over the
 * same localStorage key, so a plant added here is a plant the grid has, and a watering
 * here writes the same log entry. That is the whole point of this file changing: the
 * deck used to run on eight in-memory demo plants and forget everything on reload.
 */

import { createRoot } from 'react-dom/client';

import '../styles/deck.css';
import { registerOffline } from '../lib/offline';
import { StoreProvider } from '../lib/store';
import { Deck } from './Deck';

registerOffline();

const host = document.getElementById('root');
if (!host) throw new Error('#root is missing from index.html');

createRoot(host).render(
  <StoreProvider>
    <Deck />
  </StoreProvider>,
);
