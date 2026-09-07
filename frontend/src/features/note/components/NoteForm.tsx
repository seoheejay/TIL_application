import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextAreaField, TextField } from '@/components/common/Field'
import { Alert } from '@/components/common/Alert'
import { fromMemoDate, toMemoDate, todayInputDate } from '@/utils/date'
import type { NormalizedError } from '@/types/api'
import type { Note } from '../types'

/** CreateNoteBody의 Field 제약과 맞춘 값들. */
const TITLE_MAX = 64
/** 태그 한 개의 최대 길이. 개수 제한은 없다 (TagName = Field(min_length=1, max_length=32)). */
const TAG_NAME_MAX = 32

/**
 * 폼이 내보내는 값. tags는 항상 배열로 넘긴다(빈 배열 포함).
 * 생성에서는 []와 생략이 같고, 수정에서는 []가 "태그 전부 제거"라
 * 호출하는 쪽이 그대로 실어 보내면 된다.
 */
export interface NoteFormValues {
  title: string
  content: string
  memo_date: string
  tags: string[]
}

interface NoteFormProps {
  onSubmit: (values: NoteFormValues) => void
  isSubmitting: boolean
  error: NormalizedError | null
  onCancel?: () => void
  /** 수정 화면에서 기존 노트를 채워 넣을 때 넘긴다. */
  initialNote?: Note
  submitLabel?: string
}

export function NoteForm({
  onSubmit,
  isSubmitting,
  error,
  onCancel,
  initialNote,
  submitLabel = '저장',
}: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title ?? '')
  const [content, setContent] = useState(initialNote?.content ?? '')
  // 백엔드는 "YYYYMMDD", <input type="date">는 "YYYY-MM-DD"를 쓴다.
  const [memoDate, setMemoDate] = useState(() =>
    initialNote ? fromMemoDate(initialNote.memo_date) : todayInputDate(),
  )
  const [tagInput, setTagInput] = useState(initialNote?.tags.join(', ') ?? '')

  // 쉼표로 끊고, 빈 조각과 중복은 버린다. 백엔드도 같은 요청 안의 중복 태그는 하나로 합친다.
  const tags = Array.from(
    new Set(
      tagInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )

  const tooLongTag = tags.find((tag) => tag.length > TAG_NAME_MAX)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (tooLongTag) return

    onSubmit({
      title: title.trim(),
      content,
      memo_date: toMemoDate(memoDate),
      tags,
    })
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {error && <Alert message={error.message} />}

      <TextField
        label="제목"
        value={title}
        required
        maxLength={TITLE_MAX}
        onChange={(event) => setTitle(event.target.value)}
        hint={`${title.length} / ${TITLE_MAX}`}
        error={error?.fieldErrors.title}
      />

      <TextField
        label="날짜"
        type="date"
        value={memoDate}
        required
        onChange={(event) => setMemoDate(event.target.value)}
        error={error?.fieldErrors.memo_date}
      />

      <TextAreaField
        label="내용"
        value={content}
        required
        onChange={(event) => setContent(event.target.value)}
        error={error?.fieldErrors.content}
      />

      <TextField
        label="태그"
        value={tagInput}
        placeholder="쉼표로 구분 (예: python, fastapi)"
        onChange={(event) => setTagInput(event.target.value)}
        hint={
          tags.length > 0
            ? tags.map((tag) => `#${tag}`).join(' ')
            : initialNote
              ? '비워서 저장하면 태그가 모두 지워집니다.'
              : '선택 항목입니다.'
        }
        error={tooLongTag ? `태그는 ${TAG_NAME_MAX}자 이하여야 합니다: #${tooLongTag}` : error?.fieldErrors.tags}
      />

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button type="submit" disabled={isSubmitting || Boolean(tooLongTag)}>
          {isSubmitting ? '저장 중...' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}
