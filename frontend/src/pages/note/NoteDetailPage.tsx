import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeleteNote, useDeleteNoteTags, useNote } from '@/features/note/hooks/noteQueries'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { TagList } from '@/components/common/TagList'
import { formatDateTime, formatMemoDate } from '@/utils/date'

export function NoteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: note, isPending, error } = useNote(id)

  const deleteNote = useDeleteNote()
  const deleteTags = useDeleteNoteTags(id)

  if (isPending) return <Spinner />
  // 없는 노트와 남의 노트가 모두 404로 온다.
  if (error) return <Alert message={normalizeError(error, { 404: '노트를 찾을 수 없습니다.' }).message} />

  const actionError = deleteNote.error ?? deleteTags.error

  return (
    <>
      <div className="page-header">
        <h1>{note.title}</h1>
        <Link to="/notes" className="muted">
          목록으로
        </Link>
      </div>

      {actionError && <Alert message={normalizeError(actionError, { 404: '노트를 찾을 수 없습니다.' }).message} />}

      <article className="card">
        <div className="muted">{formatMemoDate(note.memo_date)}</div>
        <p className="note-content">{note.content}</p>
        {/* 상세에서는 태그를 눌러 같은 태그의 노트를 모아 볼 수 있게 한다. */}
        <TagList tags={note.tags} linkable />
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1.25rem 0 0.75rem' }} />
        <div className="muted">
          작성 {formatDateTime(note.created_at)} · 수정 {formatDateTime(note.updated_at)}
        </div>
      </article>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
        <Link to={`/notes/${note.id}/edit`} className="button">
          수정
        </Link>

        {note.tags.length > 0 && (
          <ConfirmButton
            label="태그 비우기"
            confirmLabel={`태그 ${note.tags.length}개 지우기`}
            pendingLabel="지우는 중..."
            isPending={deleteTags.isPending}
            onConfirm={() => deleteTags.mutate()}
          />
        )}

        <ConfirmButton
          label="삭제"
          confirmLabel="정말 삭제"
          pendingLabel="삭제 중..."
          isPending={deleteNote.isPending}
          onConfirm={() =>
            deleteNote.mutate(note.id, {
              // 지운 노트의 상세로 되돌아가지 않도록 replace로 나간다.
              onSuccess: () => navigate('/notes', { replace: true }),
            })
          }
        />
      </div>
    </>
  )
}
