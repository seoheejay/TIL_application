import { Link, useNavigate, useParams } from 'react-router-dom'
import { NoteForm } from '@/features/note/components/NoteForm'
import { useNote, useUpdateNote } from '@/features/note/hooks/noteQueries'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'

export function NoteEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: note, isPending, error } = useNote(id)
  const updateNote = useUpdateNote(id)

  if (isPending) return <Spinner />
  // 없는 노트와 남의 노트가 모두 404로 온다. 어느 쪽인지 알려주지 않는 것이 백엔드 의도다.
  if (error) return <Alert message={normalizeError(error, { 404: '노트를 찾을 수 없습니다.' }).message} />

  return (
    <>
      <div className="page-header">
        <h1>노트 수정</h1>
        <Link to={`/notes/${id}`} className="muted">
          돌아가기
        </Link>
      </div>

      <div className="card">
        <NoteForm
          // 다른 노트로 이동했을 때 입력값이 남지 않도록 묶어 둔다.
          key={note.id}
          initialNote={note}
          submitLabel="수정"
          isSubmitting={updateNote.isPending}
          error={updateNote.error ? normalizeError(updateNote.error, { 404: '노트를 찾을 수 없습니다.' }) : null}
          onCancel={() => navigate(`/notes/${id}`)}
          onSubmit={(values) =>
            // PUT은 보낸 필드만 반영한다. 폼이 모든 필드를 들고 있으므로 전부 보낸다.
            // tags가 빈 배열이면 백엔드가 태그를 전부 지운다 (생략과 다르다).
            updateNote.mutate(values, {
              onSuccess: () => navigate(`/notes/${id}`, { replace: true }),
            })
          }
        />
      </div>
    </>
  )
}
