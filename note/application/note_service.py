from ulid import ULID   # 고유 id 생성기
from note.domain.note import Note
from note.domain.repository.note_repo import INoteRepository # 인터페이스만 참조

from datetime import datetime
from note.domain.note import Tag, TagSummary

class NoteService:
    # __init__ : 객체가 만들어질 때 한 번 실행되는 생성자
    # self     : 이 객체 자신. 파이썬은 첫 인자로 항상 받는다
    def __init__(self, note_repo: INoteRepository,):
        self.note_repo = note_repo # 밖에서 받아온 저장소를 보관 (주입)
        self.ulid = ULID() # 바꿔 끼울 일 없으니 직접 생성

    def _build_tags(self, tag_names: list[str], now: datetime) -> list[Tag]:
        # 리스트 컴프리헨션 — [ 만들 것  for 변수 in 반복대상 ]
        # tag_names 안의 문자열 하나하나를 Tag 객체로 바꾼다
        # (컴프리헨션 변수 이름은 바깥 파라미터와 겹치지 않게 tag_name 으로 둔다)
        return [
            Tag(
                id=self.ulid.generate(),
                name=tag_name,
                created_at=now,
                updated_at=now,
            )
            for tag_name in tag_names
        ]

    def get_notes(
            self,
            user_id: str,
            page:int,
            items_per_page: int,
            search: str|None = None,
    ) -> tuple[int, list[Note]]: # -> 뒤는 반환 타입. (전체개수, 노트목록)
        return self.note_repo.get_notes( # 조회는 판단할 게 없어서 그대로 넘긴다
            user_id= user_id,
            page=page,
            items_per_page=items_per_page,
            search=search,
        )

    def get_tags(self, user_id: str) -> list[TagSummary]:
        return self.note_repo.get_tags(user_id)

    def get_note(self, user_id:str, id:str) -> Note:
        return self.note_repo.find_by_id(user_id, id) # 순서대로 넘기면 위치 인자

    def create_note(
            self,
            user_id: str,
            title: str,
            content: str,
            memo_date: str,
            # 기본값으로 [] 를 쓰면 함수 정의 시점에 리스트가 딱 한 개 만들어져
            # 모든 호출이 그걸 공유한다(가변 기본 인자). None 을 기본값으로 두고 안에서 푼다
            tag_names: list[str] | None = None,
    ) -> Note:
        now = datetime.now()  # 생성·수정 시각을 같은 값으로 쓰려고 한 번만 호출
        tags = self._build_tags(tag_names or [], now)

        # 도메인 객체 조립. id 생성과 시각 기록이 서비스의 실제 일이다
        note = Note(
            id=self.ulid.generate(),
            user_id=user_id,
            title=title,
            content=content,
            memo_date=memo_date,
            tags=tags,
            created_at=now,
            updated_at=now,
        )

        # 저장소가 돌려준 객체를 반환한다. 저장 과정에서 태그 중복이 정리되고
        # 이미 있던 태그는 기존 id로 재사용되므로, 방금 만든 note와 내용이 달라질 수 있다
        return self.note_repo.save(user_id,note)

    def update_note(
            self, 
            user_id: str, 
            id: str, 
            title: str|None = None,
            content: str|None = None,
            memo_date: str|None = None,
            #tag_names: list[str]|None = [],
            tag_names: list[str]|None = None,
    ) -> Note:
        note = self.note_repo.find_by_id(user_id, id)
        now = datetime.now()

        if title:
            note.title = title
        if content:
            note.content = content
        if memo_date:
            note.memo_date = memo_date
        if tag_names is not None:
            # None이 아니면 통째로 교체한다. 빈 리스트를 넘기면 "태그 전부 제거"가 된다
            note.tags = self._build_tags(tag_names, now)

        # 수정 시각 갱신은 서비스의 일. 저장소는 이 값을 그대로 기록할 뿐이다
        note.updated_at = now

        return self.note_repo.update(user_id, note)

    def delete_note(self, user_id: str, id:str):
        return self.note_repo.delete(user_id, id)

    def delete_note_tags(self, user_id: str, id:str):
        return self.note_repo.delete_tags(user_id, id)

    def get_notes_by_tag(
            self,
            user_id:str,
            tag_name: str,
            page: int,
            items_per_page: int,
    ) -> tuple[int, list[Note]]:
        return self.note_repo.get_notes_by_tag_name(
            user_id=user_id,
            tag_name=tag_name,
            page=page,
            items_per_page=items_per_page,
        )
