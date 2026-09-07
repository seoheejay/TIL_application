import { useNavigate } from 'react-router-dom'
import { NoteForm } from '@/features/note/components/NoteForm'
import { useCreateNote } from '@/features/note/hooks/noteQueries'
import { normalizeError } from '@/api/client'

export function NoteCreatePage() {
  const navigate = useNavigate()
  const createNote = useCreateNote()

  return (
    <>
      <div className="page-header">
        <h1>새 노트</h1>
      </div>

      <div className="card">
        <NoteForm
          isSubmitting={createNote.isPending}
          error={createNote.error ? normalizeError(createNote.error) : null}
          onCancel={() => navigate('/notes')}
          onSubmit={(values) =>
            // 생성에서는 tags: [] 와 생략이 같으므로 그대로 실어 보낸다.
            createNote.mutate(values, {
              onSuccess: (note) => navigate(`/notes/${note.id}`, { replace: true }),
            })
          }
        />
      </div>
    </>
  )
}
