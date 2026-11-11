/**
 * Entry point for the deck prototype, served at /deck.html.
 *
 * Separate from src/main.tsx on purpose: the grid app keeps its route, its store and
 * its tests, and this page cannot affect any of them. No StrictMode — its double
 * effect invocation in dev would start two of every GSAP timeline.
 */

import { createRoot } from 'react-dom/client';

import '../styles/deck.css';
import { Deck } from './Deck';

const host = document.getElementById('root');
if (!host) throw new Error('#root is missing from deck.html');

createRoot(host).render(<Deck />);
