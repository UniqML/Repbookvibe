import { useReadingSessions } from "./useReadingSessions";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export function useAchievements(finishedBooksCount: number, totalPagesRead: number) {
  const { getSessions } = useReadingSessions();
  const sessions = getSessions();
  
  const getReadingStreak = (): number => {
    if (sessions.length === 0) return 0;
    
    const sortedDates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const sessionDate = new Date(sortedDates[i]);
      sessionDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const achievements: Achievement[] = [
    {
      id: "first_book",
      name: "📖 Первый шаг",
      description: "Прочитай первую книгу",
      icon: "📖",
      unlocked: finishedBooksCount >= 1,
    },
    {
      id: "five_books",
      name: "📚 Пятёрка",
      description: "Прочитай 5 книг",
      icon: "📚",
      unlocked: finishedBooksCount >= 5,
    },
    {
      id: "ten_books",
      name: "🔥 Десятка",
      description: "Прочитай 10 книг",
      icon: "🔥",
      unlocked: finishedBooksCount >= 10,
    },
    {
      id: "twenty_five_books",
      name: "💫 Четверть сотни",
      description: "Прочитай 25 книг",
      icon: "💫",
      unlocked: finishedBooksCount >= 25,
    },
    {
      id: "fifty_books",
      name: "👑 Полусотня",
      description: "Прочитай 50 книг",
      icon: "👑",
      unlocked: finishedBooksCount >= 50,
    },
    {
      id: "century_pages",
      name: "⚡ Столетний дневник",
      description: "Прочитай 100 страниц в день",
      icon: "⚡",
      unlocked: sessions.some(s => s.pagesRead >= 100),
    },
    {
      id: "week_streak",
      name: "🌟 Неделя подряд",
      description: "Читай 7 дней подряд",
      icon: "🌟",
      unlocked: getReadingStreak() >= 7,
    },
    {
      id: "month_streak",
      name: "🏆 Месячный марафон",
      description: "Читай 30 дней подряд",
      icon: "🏆",
      unlocked: getReadingStreak() >= 30,
    },
    {
      id: "thousand_pages",
      name: "📖 Килотон",
      description: "Прочитай 1000 страниц",
      icon: "📖",
      unlocked: totalPagesRead >= 1000,
    },
    {
      id: "five_thousand_pages",
      name: "💎 Драгоценность",
      description: "Прочитай 5000 страниц",
      icon: "💎",
      unlocked: totalPagesRead >= 5000,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const lockedCount = achievements.length - unlockedCount;

  return { achievements, unlockedCount, lockedCount, totalAchievements: achievements.length };
}
