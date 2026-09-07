import { Link, useParams } from 'react-router-dom'
import { useNote } from '@/features/note/hooks/noteQueries'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { TagList } from '@/components/common/TagList'
import { formatDateTime, formatMemoDate } from '@/utils/date'

export function NoteDetailPage() {
  const { id = '' } = useParams()
  const { data: note, isPending, error } = useNote(id)

  if (isPending) return <Spinner />
  if (error) return <Alert message={normalizeError(error).message} />

  return (
    <>
      <div className="page-header">
        <h1>{note.title}</h1>
        <Link to="/notes" className="muted">
          목록으로
        </Link>
      </div>

      <article className="card">
        <div className="muted">{formatMemoDate(note.memo_date)}</div>
        <p className="note-content">{note.content}</p>
        <TagList tags={note.tags} />
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1.25rem 0 0.75rem' }} />
        <div className="muted">
          작성 {formatDateTime(note.created_at)} · 수정 {formatDateTime(note.updated_at)}
        </div>
      </article>
    </>
  )
}
