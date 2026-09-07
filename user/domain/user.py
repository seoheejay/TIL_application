from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: str
    name: str
    email: str
    password: str
    created_at: datetime
    updated_at: datetime
    # DB 테이블(User)에는 memo 컬럼이 있는데 도메인에 없으면
    # UserVO(**row_to_dict(user)) 가 "unexpected keyword 'memo'" 로 터진다.
    # 기본값이 있는 필드는 반드시 맨 뒤에 와야 한다.
    memo: str | None = None
