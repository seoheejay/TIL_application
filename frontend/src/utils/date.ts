/**
 * 백엔드 memo_date는 min_length=8, max_length=8 문자열이다. 즉 "YYYYMMDD".
 * <input type="date">는 "YYYY-MM-DD"를 쓰므로 경계에서 변환한다.
 */

export function toMemoDate(inputDate: string): string {
  return inputDate.replaceAll('-', '')
}

export function fromMemoDate(memoDate: string): string {
  if (memoDate.length !== 8) return ''
  return `${memoDate.slice(0, 4)}-${memoDate.slice(4, 6)}-${memoDate.slice(6, 8)}`
}

export function formatMemoDate(memoDate: string): string {
  if (memoDate.length !== 8) return memoDate
  return `${memoDate.slice(0, 4)}.${memoDate.slice(4, 6)}.${memoDate.slice(6, 8)}`
}

export function todayInputDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** created_at / updated_at 같은 ISO 문자열용. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
