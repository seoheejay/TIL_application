# -*- coding: utf-8 -*-
"""
어드민 토큰 발급기.

로그인 API(/users/login)는 항상 Role.USER 토큰만 발급한다.
어드민 토큰은 이 스크립트로만 만든다 — 서명에 SECRET_KEY가 필요하므로
서버 시크릿을 가진 운영자만 발급할 수 있다. HTTP로 열어두면 누구나
어드민이 될 수 있으므로 일부러 엔드포인트를 만들지 않았다.

사용법:
    python scripts/create_admin_token.py <user_id> [만료시간(시간)]

    # 운영에서는 서버와 같은 시크릿을 넣어야 서버가 그 토큰을 받아들인다
    JWT_SECRET_KEY=... python scripts/create_admin_token.py 01JXXXX 24
"""
import sys
from pathlib import Path

# 윈도우 기본 콘솔(cp949)에서 한글 출력이 깨지지 않도록 강제한다
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# 프로젝트 루트를 import 경로에 넣는다(스크립트를 어디서 실행하든 동작하도록)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import timedelta

from common.auth import ACCESS_TOKEN_EXPIRE_HOURS, Role, create_access_token


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    user_id = sys.argv[1]
    hours = int(sys.argv[2]) if len(sys.argv) > 2 else ACCESS_TOKEN_EXPIRE_HOURS

    token = create_access_token(
        payload={"user_id": user_id},
        role=Role.ADMIN,
        expires_delta=timedelta(hours=hours),
    )

    print(f"user_id : {user_id}")
    print(f"role    : {Role.ADMIN}")
    print(f"만료    : {hours}시간")
    print()
    print(token)
    print()
    print("사용 예) Authorization 헤더에 담아 보낸다")
    print(f'  curl -H "Authorization: Bearer {token}" http://127.0.0.1:8000/users')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
