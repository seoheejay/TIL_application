import { useEffect, useState } from 'react'
import { Button } from './Button'

interface ConfirmButtonProps {
  /** 평소에 보이는 문구 */
  label: string
  /** 한 번 누른 뒤 보이는 확인 문구 */
  confirmLabel: string
  /** 진행 중 문구 */
  pendingLabel?: string
  onConfirm: () => void
  isPending?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}

/**
 * 되돌릴 수 없는 동작(삭제, 탈퇴)용 2단계 버튼.
 * window.confirm을 쓰지 않는 이유: 브라우저 기본 대화상자는 문구를 다듬을 수 없고,
 * 렌더링을 멈춰 세워서 진행 상태를 보여줄 수 없다.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  pendingLabel = '처리 중...',
  onConfirm,
  isPending = false,
  disabled = false,
  variant = 'secondary',
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  // 눌러놓고 잊은 상태로 남지 않게 잠시 뒤 원래대로 돌린다.
  useEffect(() => {
    if (!armed || isPending) return
    const timer = window.setTimeout(() => setArmed(false), 5000)
    return () => window.clearTimeout(timer)
  }, [armed, isPending])

  if (isPending) {
    return (
      <Button variant={variant} disabled>
        {pendingLabel}
      </Button>
    )
  }

  if (!armed) {
    return (
      <Button variant={variant} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </Button>
    )
  }

  return (
    <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
      <Button variant="primary" onClick={onConfirm} autoFocus>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        취소
      </Button>
    </span>
  )
}
