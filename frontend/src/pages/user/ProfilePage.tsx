import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteUser, useMe, useUpdateUser } from '@/features/user/hooks/userQueries'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import type { User } from '@/features/user/types'
import { normalizeError } from '@/api/client'
import { Button } from '@/components/common/Button'
import { TextAreaField, TextField } from '@/components/common/Field'
import { Alert } from '@/components/common/Alert'
import { Spinner } from '@/components/common/Spinner'
import { formatDateTime } from '@/utils/date'

export function ProfilePage() {
  const { data: me, isPending, error } = useMe()

  if (isPending) return <Spinner />
  if (error) return <Alert message={normalizeError(error).message} />

  return (
    <>
      <div className="page-header">
        <h1>내 정보</h1>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <dl className="stack" style={{ margin: 0 }}>
          <div>
            <dt className="muted">이름</dt>
            <dd style={{ margin: 0 }}>{me.name}</dd>
          </div>
          <div>
            <dt className="muted">이메일</dt>
            <dd style={{ margin: 0 }}>{me.email}</dd>
          </div>
          <div>
            <dt className="muted">가입일</dt>
            <dd style={{ margin: 0 }}>{formatDateTime(me.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* key로 묶어 두면 다른 계정으로 바뀌었을 때 입력값이 새로 초기화된다. */}
      <ProfileForm key={me.id} me={me} />

      <DangerZone />
    </>
  )
}

/** 되돌릴 수 없는 동작만 모아 둔다. 저장 폼과 섞이면 실수로 누르기 쉽다. */
function DangerZone() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const deleteUser = useDeleteUser()
  const error = deleteUser.error ? normalizeError(deleteUser.error) : null

  return (
    <div className="card" style={{ maxWidth: 480, marginTop: '1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem' }}>회원 탈퇴</h2>
      <p className="muted" style={{ marginTop: '0.5rem' }}>
        계정과 함께 작성한 노트가 모두 삭제됩니다. 되돌릴 수 없습니다.
      </p>

      {error && <Alert message={error.message} />}

      <div style={{ marginTop: '1rem' }}>
        <ConfirmButton
          label="회원 탈퇴"
          confirmLabel="계정과 노트를 모두 삭제"
          pendingLabel="탈퇴 처리 중..."
          isPending={deleteUser.isPending}
          onConfirm={() =>
            deleteUser.mutate(undefined, {
              onSuccess: () => {
                // 토큰이 남아 있으면 ProtectedRoute가 통과시켜 버린다. 먼저 지운다.
                signOut()
                navigate('/login', { replace: true })
              },
            })
          }
        />
      </div>
    </div>
  )
}

function ProfileForm({ me }: { me: User }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [memo, setMemo] = useState(me.memo ?? '')
  // memo는 "보내면 덮어쓰고 빈 문자열이면 지운다"라서, 손대지 않았으면 아예 보내지 않는다.
  const [memoDirty, setMemoDirty] = useState(false)

  const updateUser = useUpdateUser()
  const error = updateUser.error ? normalizeError(updateUser.error) : null

  const nothingToSubmit = !name && !password && !memoDirty

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    updateUser.mutate(
      {
        ...(name ? { name } : {}),
        ...(password ? { password } : {}),
        ...(memoDirty ? { memo } : {}),
      },
      {
        onSuccess: () => {
          setName('')
          setPassword('')
          setMemoDirty(false)
        },
      },
    )
  }

  return (
    <div className="card" style={{ maxWidth: 480, marginTop: '1rem' }}>
      <p className="muted">바꾸고 싶은 항목만 채워서 저장하세요.</p>

      <form className="stack" onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        {error && <Alert message={error.message} />}
        {updateUser.isSuccess && !error && <p className="muted">저장했습니다.</p>}

        <TextField
          label="새 이름"
          value={name}
          placeholder="변경하지 않으려면 비워 두세요 (2~32자)"
          onChange={(event) => setName(event.target.value)}
          error={error?.fieldErrors.name}
        />
        <TextField
          label="새 비밀번호"
          type="password"
          value={password}
          autoComplete="new-password"
          placeholder="변경하지 않으려면 비워 두세요 (8~32자)"
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldErrors.password}
        />
        <TextAreaField
          label="메모"
          value={memo}
          placeholder="비워서 저장하면 메모가 지워집니다"
          maxLength={1000}
          onChange={(event) => {
            setMemo(event.target.value)
            setMemoDirty(true)
          }}
          error={error?.fieldErrors.memo}
        />

        <Button type="submit" disabled={updateUser.isPending || nothingToSubmit}>
          {updateUser.isPending ? '저장 중...' : '저장'}
        </Button>
      </form>
    </div>
  )
}
