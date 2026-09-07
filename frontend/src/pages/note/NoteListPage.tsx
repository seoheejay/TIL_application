import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNotes } from '@/features/note/hooks/noteQueries'
import { NoteCard } from '@/features/note/components/NoteCard'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const ITEMS_PER_PAGE = 10

export function NoteListPage() {
  // 페이지 번호와 검색어를 URL에 두면 새로고침, 뒤로가기, 링크 공유가 그냥 동작한다.
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const queryFromUrl = searchParams.get('q') ?? ''

  // 입력칸은 즉시 반응해야 하므로 따로 들고, URL 반영은 한 박자 늦춘다.
  const [input, setInput] = useState(queryFromUrl)
  const debounced = useDebouncedValue(input, 300)

  // 뒤로가기로 URL이 바뀌었을 때 입력칸도 따라가게 한다.
  useEffect(() => {
    setInput(queryFromUrl)
  }, [queryFromUrl])

  // 검색어가 바뀌면 1페이지로 되돌린다.
  // 3페이지에서 검색하면 결과가 1페이지뿐인데 빈 화면이 보이기 때문이다.
  useEffect(() => {
    if (debounced === queryFromUrl) return
    setSearchParams(debounced ? { q: debounced } : {}, { replace: true })
  }, [debounced, queryFromUrl, setSearchParams])

  const { data, isPending, isFetching, error } = useNotes({
    page,
    items_per_page: ITEMS_PER_PAGE,
    search: queryFromUrl || undefined,
  })

  const isSearching = Boolean(queryFromUrl)

  const goToPage = (next: number) => {
    setSearchParams(isSearching ? { q: queryFromUrl, page: String(next) } : { page: String(next) })
  }

  return (
    <>
      <div className="page-header">
        <h1>노트</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/notes/tags" className="muted">
            태그 모아보기
          </Link>
          <Link to="/notes/new" className="button">
            새 노트
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <SearchInput value={input} onChange={setInput} />
      </div>

      {isPending && <Spinner />}
      {error && <Alert message={normalizeError(error).message} />}

      {data && data.notes.length === 0 && (
        <EmptyState>
          {isSearching ? (
            <>
              &lsquo;{queryFromUrl}&rsquo;와 일치하는 노트가 없습니다.{' '}
              <Link to="/notes">전체 노트 보기</Link>
            </>
          ) : (
            <>
              아직 노트가 없습니다. <Link to="/notes/new">첫 노트를 써보세요.</Link>
            </>
          )}
        </EmptyState>
      )}

      {data && data.notes.length > 0 && (
        <>
          <p className="muted">
            {isSearching ? `‘${queryFromUrl}’ 검색 결과 ${data.total_count}개` : `전체 ${data.total_count}개`}
            {/* 이전 결과를 띄운 채 새 결과를 받는 중임을 알린다 (placeholderData) */}
            {isFetching && ' · 불러오는 중'}
          </p>
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
