import { Link, useSearchParams } from 'react-router-dom'
import { useNotes } from '@/features/note/hooks/noteQueries'
import { NoteCard } from '@/features/note/components/NoteCard'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'

const ITEMS_PER_PAGE = 10

export function NoteListPage() {
  // 페이지 번호를 URL에 두면 새로고침과 뒤로가기가 그냥 동작한다.
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const { data, isPending, error } = useNotes({ page, items_per_page: ITEMS_PER_PAGE })

  const goToPage = (next: number) => {
    setSearchParams({ page: String(next) })
  }

  return (
    <>
      <div className="page-header">
        <h1>노트</h1>
        <Link to="/notes/new" className="button">
          새 노트
        </Link>
      </div>

      {isPending && <Spinner />}
      {error && <Alert message={normalizeError(error).message} />}

      {data && data.notes.length === 0 && (
        <EmptyState>
          아직 노트가 없습니다. <Link to="/notes/new">첫 노트를 써보세요.</Link>
        </EmptyState>
      )}

      {data && data.notes.length > 0 && (
        <>
          <p className="muted">전체 {data.total_count}개</p>
          <ul className="note-grid" style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
            {data.notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
          <Pagination
            page={page}
            itemsPerPage={ITEMS_PER_PAGE}
            totalCount={data.total_count}
            onChange={goToPage}
          />
        </>
      )}
    </>
  )
}
