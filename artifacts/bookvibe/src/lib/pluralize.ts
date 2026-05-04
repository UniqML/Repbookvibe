export function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.floor(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export const pl = {
  day: (n: number) => pluralize(n, "день", "дня", "дней"),
  days: (n: number) => `${n} ${pluralize(n, "день", "дня", "дней")}`,
  book: (n: number) => pluralize(n, "книга", "книги", "книг"),
  books: (n: number) => `${n} ${pluralize(n, "книга", "книги", "книг")}`,
  page: (n: number) => pluralize(n, "страница", "страницы", "страниц"),
  pages: (n: number) => `${n} ${pluralize(n, "страница", "страницы", "страниц")}`,
  session: (n: number) => pluralize(n, "сессия", "сессии", "сессий"),
  entry: (n: number) => pluralize(n, "запись", "записи", "записей"),
  minute: (n: number) => pluralize(n, "минута", "минуты", "минут"),
  hour: (n: number) => pluralize(n, "час", "часа", "часов"),
};
