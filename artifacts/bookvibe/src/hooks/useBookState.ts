import { useState, useEffect, useCallback } from 'react';

export function useBookState() {
  const [activeBookId, setActiveBookId] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('bookvibe_active_book');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });

  const setActiveBook = useCallback((id: number | null) => {
    setActiveBookId(id);
    if (id) {
      localStorage.setItem('bookvibe_active_book', id.toString());
    } else {
      localStorage.removeItem('bookvibe_active_book');
    }
  }, []);

  const clearActiveBook = useCallback(() => {
    setActiveBook(null);
  }, [setActiveBook]);

  return {
    activeBookId,
    setActiveBook,
    clearActiveBook,
  };
}
