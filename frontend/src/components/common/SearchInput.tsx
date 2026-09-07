import { useId } from 'react'
import { Button } from './Button'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 백엔드 제약과 맞춘다 (search: Query(max_length=64)) */
  maxLength?: number
}

export function SearchInput({
  value,
  onChange,
  placeholder = '제목·내용 검색',
  maxLength = 64,
}: SearchInputProps) {
  const id = useId()

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        검색
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          id={id}
          className="input"
          type="search"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          style={{ flex: 1 }}
        />
        {/* 값이 있을 때만 보여준다. 빈 칸 옆의 지우기 버튼은 눌 곳이 없다 */}
        {value && (
          <Button variant="secondary" onClick={() => onChange('')}>
            지우기
          </Button>
        )}
      </div>
    </div>
  )
}
