from dataclasses import dataclass
from datetime import datetime

@dataclass
class Tag:
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

@dataclass
class Note:
    id: str
    user_id: str
    title: str
    content: str
    memo_date: str
    tags: list[Tag]
    created_at: datetime
    updated_at: datetime


@dataclass
class TagSummary:
    """
    "내 태그 목록" 화면용 읽기 모델.
    Tag 엔티티와 달리 id나 시각이 없다. 화면이 필요한 건 이름과 개수뿐이다
    """
    name: str
    count: int
