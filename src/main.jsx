import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TagGame from './TagGame.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TagGame />
  </StrictMode>,
);
