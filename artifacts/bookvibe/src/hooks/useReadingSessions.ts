export interface ReadingSession {
  date: string;
  bookId: number | string;
  bookTitle: string;
  bookCover: string;
  pagesRead: number;
  durationSeconds: number;
  timestamp: number;
}

const KEY = "bookvibe_reading_sessions";

function getSessions(): ReadingSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addReadingSession(session: ReadingSession) {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function getSessionsByDate(): Record<string, ReadingSession[]> {
  const sessions = getSessions();
  const map: Record<string, ReadingSession[]> = {};
  sessions.forEach(s => {
    if (!map[s.date]) map[s.date] = [];
    if (!map[s.date].find(x => x.bookId === s.bookId)) {
      map[s.date].push(s);
    }
  });
  return map;
}

export function useReadingSessions() {
  return { getSessions, addReadingSession, getSessionsByDate };
}
