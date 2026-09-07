import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useNotesByTag } from '@/features/note/hooks/noteQueries'
import { NoteCard } from '@/features/note/components/NoteCard'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'

const ITEMS_PER_PAGE = 10

export function NoteTagPage() {
  // 라우터가 이미 디코딩해서 넘겨준다. 한글 태그도 그대로 들어온다.
  const { tagName = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const { data, isPending, error } = useNotesByTag({ tagName, page, items_per_page: ITEMS_PER_PAGE })

  return (
    <>
      <div className="page-header">
        <h1>#{tagName}</h1>
        <Link to="/notes" className="muted">
          전체 노트
        </Link>
      </div>

      {isPending && <Spinner />}
      {error && <Alert message={normalizeError(error).message} />}

      {data && data.notes.length === 0 && (
        <EmptyState>
          #{tagName} 태그가 붙은 노트가 없습니다. <Link to="/notes">전체 노트로 돌아가기</Link>
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
            onChange={(next) => setSearchParams({ page: String(next) })}
          />
        </>
      )}
    </>
  )
}
