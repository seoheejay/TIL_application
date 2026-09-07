export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <ul className="tag-list">
      {tags.map((tag, index) => (
        // 백엔드가 태그 이름 문자열만 내려주고 중복을 막지 않아서 index를 섞어 키를 만든다.
        <li key={`${tag}-${index}`} className="tag">
          #{tag}
        </li>
      ))}
    </ul>
  )
}
