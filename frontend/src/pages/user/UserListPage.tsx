import { useSearchParams } from 'react-router-dom'
import { useUsers } from '@/features/user/hooks/userQueries'
import { normalizeError } from '@/api/client'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { formatDateTime } from '@/utils/date'

const ITEMS_PER_PAGE = 10

/**
 * GET /users는 ADMIN 토큰에만 열려 있다. 로그인으로는 USER 토큰만 나오므로
 * 어드민 토큰은 백엔드의 scripts/create_admin_token.py 로 만든 값을 저장소에 넣어야 한다.
 */
const FORBIDDEN_MESSAGE =
  '전체 유저 목록은 ADMIN 토큰으로만 볼 수 있습니다. 일반 로그인 토큰은 USER 권한입니다.'

export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const { data, isPending, error } = useUsers({ page, items_per_page: ITEMS_PER_PAGE })

  if (isPending) return <Spinner />
  if (error) return <Alert message={normalizeError(error, { 403: FORBIDDEN_MESSAGE }).message} />
  if (data.users.length === 0) return <EmptyState>등록된 유저가 없습니다.</EmptyState>

  return (
    <>
      <div className="page-header">
        <h1>유저</h1>
        <span className="muted">전체 {data.total_count}명</span>
      </div>

      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>가입일</th>
              <th>수정일</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{formatDateTime(user.created_at)}</td>
                <td>{formatDateTime(user.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        itemsPerPage={ITEMS_PER_PAGE}
        totalCount={data.total_count}
        onChange={(next) => setSearchParams({ page: String(next) })}
      />
    </>
  )
}
