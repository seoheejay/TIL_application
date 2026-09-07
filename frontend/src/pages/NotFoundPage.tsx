import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState>
      <h2>페이지를 찾을 수 없습니다.</h2>
      <p>
        <Link to="/notes">노트 목록으로 돌아가기</Link>
      </p>
    </EmptyState>
  )
}
