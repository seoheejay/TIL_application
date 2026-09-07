import { Link } from 'react-router-dom'

interface TagListProps {
  tags: string[]
  /**
   * 태그를 검색 링크로 만든다.
   * NoteCard처럼 이미 <Link> 안에 들어가는 자리에서는 켜면 안 된다 —
   * <a> 안에 <a>는 유효하지 않은 HTML이고 클릭 동작도 어긋난다.
   */
  linkable?: boolean
}

export function TagList({ tags, linkable = false }: TagListProps) {
  if (tags.length === 0) return null
  return (
    <ul className="tag-list">
      {tags.map((tag, index) => (
        // 백엔드가 태그 이름 문자열만 내려주고 중복을 막지 않아서 index를 섞어 키를 만든다.
        <li key={`${tag}-${index}`} className="tag">
          {linkable ? (
            <Link to={`/notes/tags/${encodeURIComponent(tag)}`}>#{tag}</Link>
          ) : (
            <>#{tag}</>
          )}
        </li>
      ))}
    </ul>
  )
}
