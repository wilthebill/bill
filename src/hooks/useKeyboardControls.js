import { useEffect, useRef } from 'react';

const GAME_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'W',
  'A',
  'S',
  'D',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'f',
  'F',
  'Enter',
  'Escape',
]);

export function useKeyboardControls(enabled) {
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    const activeKeys = pressedKeys.current;

    const handleKeyDown = (event) => {
      if (!GAME_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      if (enabled) {
        activeKeys.add(event.key);
        activeKeys.add(event.key.toLowerCase());
      }
    };

    const handleKeyUp = (event) => {
      if (!GAME_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      activeKeys.delete(event.key);
      activeKeys.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      activeKeys.clear();
    };
  }, [enabled]);

  return pressedKeys;
}
