export interface ReadingGoal {
  targetBooks: number;
  targetYear: number;
  createdAt: number;
}

const KEY = "bookvibe_reading_goal";

export function useReadingGoal() {
  const getGoal = (): ReadingGoal | null => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setGoal = (targetBooks: number, targetYear: number) => {
    const goal: ReadingGoal = {
      targetBooks,
      targetYear,
      createdAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(goal));
  };

  const deleteGoal = () => {
    localStorage.removeItem(KEY);
  };

  return { getGoal, setGoal, deleteGoal };
}
