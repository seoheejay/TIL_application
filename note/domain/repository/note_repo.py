from abc import ABCMeta, abstractmethod
from note.domain.note import Note, TagSummary

class INoteRepository(metaclass=ABCMeta):
    @abstractmethod
    def get_notes(
        self,
        user_id:str,
        page: int,
        items_per_page: int,
        search: str|None = None,
    ) -> tuple[int, list[Note]]:
        """search를 주면 제목/본문에서 그 말이 든 노트만 걸러낸다"""
        raise NotImplementedError

    @abstractmethod
    def get_tags(self, user_id:str) -> list[TagSummary]:
        """내가 쓴 태그와 각 태그가 붙은 내 노트 개수"""
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, user_id:str, id:str) -> Note:
        raise NotImplementedError

    @abstractmethod
    def save(self, user_id:str, note:Note) -> Note:
        raise NotImplementedError

    @abstractmethod
    def update(self, user_id:str, note:Note) -> Note:
        raise NotImplementedError

    @abstractmethod
    def delete(self, user_id:str, id:str):
        raise NotImplementedError

    @abstractmethod
    def delete_tags(self, user_id:str, id:str):
        raise NotImplementedError

    @abstractmethod
    def get_notes_by_tag_name(
        self, 
        user_id:str,
        tag_name: str,
        page: int,
        items_per_page: int,
    ) -> tuple[int, list[Note]]:
        raise NotImplementedError