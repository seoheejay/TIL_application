import { Link } from 'react-router-dom'
import { useTags } from '@/features/note/hooks/noteQueries'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * 개수에 따라 글자 크기를 달리해서 많이 쓴 태그가 눈에 먼저 들어오게 한다.
 * 가장 많은 태그를 기준으로 삼되, 전부 1개면 나누기에서 0이 되지 않게 막는다.
 */
function fontSizeFor(count: number, max: number): string {
  if (max <= 1) return '1rem'
  const ratio = (count - 1) / (max - 1) // 0 ~ 1
  return `${(0.95 + ratio * 0.75).toFixed(2)}rem`
}

export function TagIndexPage() {
  const { data, isPending, error } = useTags()

  if (isPending) return <Spinner />
  if (error) return <Alert message={normalizeError(error).message} />

  const tags = data.tags
  const max = tags.length > 0 ? tags[0].count : 0 // 백엔드가 개수 내림차순으로 준다
  const totalTagged = tags.reduce((sum, tag) => sum + tag.count, 0)

  return (
    <>
      <div className="page-header">
        <h1>태그</h1>
        <Link to="/notes" className="muted">
          전체 노트
        </Link>
      </div>

      {tags.length === 0 && (
        <EmptyState>
          아직 태그가 없습니다. <Link to="/notes/new">노트를 쓸 때 태그를 달아보세요.</Link>
        </EmptyState>
      )}

      {tags.length > 0 && (
        <>
          <p className="muted">
            태그 {tags.length}개 · 태그가 달린 노트 {totalTagged}건
          </p>

          <div className="card" style={{ marginTop: '0.75rem' }}>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem 0.75rem',
                alignItems: 'baseline',
              }}
            >
              {tags.map((tag) => (
                <li key={tag.name}>
                  <Link
                    to={`/notes/tags/${encodeURIComponent(tag.name)}`}
                    className="tag"
                    style={{ fontSize: fontSizeFor(tag.count, max), display: 'inline-block' }}
                  >
                    #{tag.name}
                    <span className="muted" style={{ marginLeft: '0.35rem', fontSize: '0.8em' }}>
                      {tag.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
