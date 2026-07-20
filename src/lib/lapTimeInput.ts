/**
 * 区切りなしのラップタイムを右から「ミリ秒3桁・秒2桁・分」として整形する。
 * 例: 123456 -> 1:23.456
 */
export function formatCompactLapTimeInput(input: string): string {
  const digits = input
    .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xFEE0))
    .replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 3) {
    return `0:00.${digits.padStart(3, '0')}`;
  }

  if (digits.length <= 5) {
    const seconds = digits.slice(0, -3);
    const milliseconds = digits.slice(-3);
    return `0:${seconds.padStart(2, '0')}.${milliseconds}`;
  }

  const minutes = digits.slice(0, -5).slice(-2);
  const seconds = digits.slice(-5, -3);
  const milliseconds = digits.slice(-3);
  return `${minutes}:${seconds}.${milliseconds}`;
}
