from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import ACCESS_TOKEN_EXPIRE_HOURS, JWT_ALGORITHM, JWT_SECRET_KEY

#시크릿은 소스에 적지 않고 .env 에서 읽는다.
#이 값이 유출되면 누구나 ADMIN 토큰을 위조할 수 있다
SECRET_KEY = JWT_SECRET_KEY
ALGORITHM = JWT_ALGORITHM

# tokenUrl은 실제 로그인 라우터 경로. 스웨거의 Authorize 버튼이 이 경로로 폼을 보낸다
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


class Role(StrEnum):
    """
    역할. StrEnum이라 Role.ADMIN == "ADMIN" 이 참이고 그대로 JSON 직렬화된다.
    덕분에 토큰 페이로드에 넣을 때 .value 로 변환할 필요가 없다
    """
    ADMIN = "ADMIN"
    USER = "USER"


@dataclass
class CurrentUser:
    """토큰에서 꺼낸, 지금 요청을 보낸 사람. DB 조회 없이 id와 역할만 들고 다닌다"""
    id: str
    role: Role


def create_access_token(
    payload: dict,
    role: Role,
    expires_delta: timedelta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = payload.copy()          # 넘겨받은 딕셔너리를 직접 건드리지 않으려고 복사
    to_encode.update({
        "role": role,                   # 권한 검사의 근거. 서명 안에 들어가므로 위조할 수 없다
        "exp": expire,                  # exp는 JWT 표준 클레임. 만료 검사는 라이브러리가 해준다
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        # 서명 위조, 형식 오류 등을 한 번에 받는다
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> CurrentUser:
    """
    "로그인한 사람인가"만 본다. 역할이 USER든 ADMIN이든 통과한다.
    라우터보다 먼저 실행되므로, 토큰이 없거나 잘못됐으면 라우터 함수는 아예 호출되지 않는다.
    """
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    role = payload.get("role")

    if not user_id or not role:
        raise _credentials_exception()

    # 서명은 통과했지만 role 값이 우리가 아는 값이 아닐 수 있다(예전 토큰, 오타).
    # 여기서 걸러야 아래 권한 검사가 신뢰할 수 있는 값만 다룬다
    try:
        role = Role(role)
    except ValueError:
        raise _credentials_exception()

    return CurrentUser(id=user_id, role=role)


def get_admin_user(token: Annotated[str, Depends(oauth2_scheme)]) -> CurrentUser:
    """
    "어드민인가"까지 본다. 어드민 전용 라우터는 get_current_user 대신 이걸 건다.
    401(누구인지 모르겠다)과 403(누군지는 알지만 권한이 없다)을 구분한다
    """
    current_user = get_current_user(token)

    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    return current_user
