import { Button } from './Button'

interface PaginationProps {
  page: number
  itemsPerPage: number
  totalCount: number
  onChange: (page: number) => void
}

export function Pagination({ page, itemsPerPage, totalCount, onChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(totalCount / itemsPerPage))
  if (lastPage <= 1) return null

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <Button variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        이전
      </Button>
      <span className="muted">
        {page} / {lastPage}
      </span>
      <Button variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= lastPage}>
        다음
      </Button>
    </nav>
  )
}
