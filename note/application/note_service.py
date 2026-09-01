from ulid import ULID   # 고유 id 생성기
from note.domain.note import Note
from note.domain.repository.note_repo import INoteRepository # 인터페이스만 참조

from datetime import datetime
from note.domain.note import Tag

class NoteService:
    # __init__ : 객체가 만들어질 때 한 번 실행되는 생성자
    # self     : 이 객체 자신. 파이썬은 첫 인자로 항상 받는다
    def __init__(self, note_repo: INoteRepository,):
        self.note_repo = note_repo # 밖에서 받아온 저장소를 보관 (주입)
        self.ulid = ULID() # 바꿔 끼울 일 없으니 직접 생성

    def get_notes(
            self,
            user_id: str,
            page:int,
            items_per_page: int,
    ) -> tuple[int, list[Note]]: # -> 뒤는 반환 타입. (전체개수, 노트목록)
        return self.note_repo.get_notes( # 조회는 판단할 게 없어서 그대로 넘긴다
            user_id= user_id,
            page=page,
            items_per_page=items_per_page,
        )

    def get_note(self, user_id:str, id:str) -> Note:
        return self.note_repo.find_by_id(user_id, id) # 순서대로 넘기면 위치 인자

    def create_note(
            self,
            user_id: str,
            title: str,
            content: str,
            memo_date: str,
            tag_names: list[str] = [], # = [] 는 기본값. 안 넘기면 빈 리스트
    ) -> Note:
        now = datetime.now()  # 생성·수정 시각을 같은 값으로 쓰려고 한 번만 호출
        # 리스트 컴프리헨션 — [ 만들 것  for 변수 in 반복대상 ]
        # tag_names 안의 문자열 하나하나를 Tag 객체로 바꾼다
        tags = [
            Tag(
                id = self.ulid.generate(),
                name = title,
                updated_at= now,
                created_at= now,
            )
            for title in tag_names
        ]
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

        self.note_repo.save(user_id,note)

        return note

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
        if title:
            note.title = title
        if content:
            note.content = content
        if memo_date:
            note.memo_date = memo_date
        if tag_names is not None:
            now = datetime.now()
            note.tags = [
                Tag(
                    id = self.ulid.generate(),
                    name= title,
                    created_at= now,
                    updated_at= now,
                )
                for title in tag_names
            ]

        return self.note_repo.update(user_id, note)

    def delete_note(self, user_id: str, id:str):
        return self.note_repo.delete(user_id, id)

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