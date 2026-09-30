const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Fixed abbreviations: Intl's en-GB output varies by ICU version ("Sep" vs "Sept").
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatTileAge(createdAt: string, now: Date = new Date()) {
  const created = new Date(createdAt);
  // Timestamps slightly in the future (clock skew) read as "just now".
  const elapsed = Math.max(0, now.getTime() - created.getTime());

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  const date = `${created.getDate()} ${MONTHS[created.getMonth()]}`;
  return created.getFullYear() === now.getFullYear()
    ? date
    : `${date} ${created.getFullYear()}`;
}
