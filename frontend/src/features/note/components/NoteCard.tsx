import { Link } from 'react-router-dom'
import { TagList } from '@/components/common/TagList'
import { formatMemoDate } from '@/utils/date'
import type { Note } from '../types'

export function NoteCard({ note }: { note: Note }) {
  return (
    <li>
      <Link to={`/notes/${note.id}`} className="note-card">
        <div className="note-card__title">{note.title}</div>
        <div className="muted">{formatMemoDate(note.memo_date)}</div>
        <p className="note-card__excerpt">{note.content}</p>
        <TagList tags={note.tags} />
      </Link>
    </li>
  )
}
