import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Exactly what a consumer writes. Vite's library build extracts CSS rather than
// leaving it in the JS, so importing the component does not bring it along.
import '@uyap/listing-map/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
