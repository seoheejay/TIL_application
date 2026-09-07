from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database import SessionLocal
from note.domain.note import Note as NoteVO
from note.domain.note import Tag as TagVO
from note.domain.repository.note_repo import INoteRepository
from note.infra.db_models.note import Note, Tag
#Note/Tag는 DB 테이블, NoteVO/TagVO는 도메인 객체. 이름이 같아서 as로 구분한다


class NoteRepository(INoteRepository):
    # ------------------------------------------------------------------
    # 내부 헬퍼 — DB 모델과 도메인 객체 사이를 번역한다. 인프라 계층의 진짜 일
    # ------------------------------------------------------------------
    @staticmethod
    def _to_vo(note: Note) -> NoteVO:
        """DB 모델 -> 도메인 객체. 밖으로 나가는 것은 반드시 VO여야 SQLAlchemy가 새지 않는다"""
        return NoteVO(
            id=note.id,
            user_id=note.user_id,
            title=note.title,
            content=note.content,
            memo_date=note.memo_date,
            tags=[
                TagVO(
                    id=tag.id,
                    name=tag.name,
                    created_at=tag.created_at,
                    updated_at=tag.updated_at,
                )
                for tag in note.tags
            ],
            created_at=note.created_at,
            updated_at=note.updated_at,
        )

    @staticmethod
    def _get_or_create_tags(db: Session, tag_vos: list[TagVO]) -> list[Tag]:
        """
        태그명은 전역 유니크다. 이미 있는 이름이면 그 행을 재사용하고, 없을 때만 새로 만든다.
        (이 경우 서비스가 만들어준 TagVO.id는 버려지고 기존 행의 id가 쓰인다)
        """
        tags: list[Tag] = []
        seen: set[str] = set()  #같은 요청 안에 중복 태그명이 들어와도 한 번만 붙인다

        for tag_vo in tag_vos:
            if tag_vo.name in seen:
                continue
            seen.add(tag_vo.name)

            tag = db.query(Tag).filter(Tag.name == tag_vo.name).first()
            if not tag:
                tag = Tag(
                    id=tag_vo.id,
                    name=tag_vo.name,
                    created_at=tag_vo.created_at,
                    updated_at=tag_vo.updated_at,
                )
                db.add(tag)
                db.flush()  #commit 없이 INSERT만 내보낸다. 아래에서 바로 참조할 수 있게

            tags.append(tag)

        return tags

    @staticmethod
    def _delete_orphan_tags(db: Session):
        """어느 노트에도 붙어있지 않게 된 태그를 정리한다. 안 하면 Tag 테이블이 계속 불어난다"""
        orphan_ids = [tag.id for tag in db.query(Tag).filter(~Tag.notes.any()).all()]
        if orphan_ids:
            db.query(Tag).filter(Tag.id.in_(orphan_ids)).delete(synchronize_session=False)

    @staticmethod
    def _find_owned(db: Session, user_id: str, id: str) -> Note:
        """
        user_id와 id를 함께 걸어 조회한다.
        노트 id를 알아도 남의 노트는 잡히지 않는다 — 소유권 검사가 WHERE 절까지 내려온 지점
        """
        note = db.query(Note).filter(Note.user_id == user_id, Note.id == id).first()

        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return note

    # ------------------------------------------------------------------
    # INoteRepository 구현
    # ------------------------------------------------------------------
    def get_notes(
            self,
            user_id:str,
            page:int,
            items_per_page:int,
    ) -> tuple[int, list[NoteVO]]:
        with SessionLocal() as db:
            query = db.query(Note).filter(Note.user_id == user_id)
            total_count = query.count()  #페이지를 자르기 전 전체 개수

            offset = (page - 1) * items_per_page
            notes = (
                query.order_by(Note.memo_date.desc(), Note.created_at.desc())
                .offset(offset)
                .limit(items_per_page)
                .all()
            )

            return total_count, [self._to_vo(note) for note in notes]

    def find_by_id(self, user_id:str, id:str) -> NoteVO:
        with SessionLocal() as db:
            return self._to_vo(self._find_owned(db, user_id, id))

    def save(self, user_id:str, note:NoteVO) -> NoteVO:
        with SessionLocal() as db:
            try:
                new_note = Note(
                    id=note.id,
                    user_id=user_id,  #도메인 객체의 값이 아니라 인수로 받은 값을 쓴다(토큰에서 온 값)
                    title=note.title,
                    content=note.content,
                    memo_date=note.memo_date,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                )
                #관계에 객체를 넣으면 Note_Tag 행은 SQLAlchemy가 알아서 만든다
                new_note.tags = self._get_or_create_tags(db, note.tags)

                db.add(new_note)
                db.commit()

                return self._to_vo(new_note)
            except:
                db.rollback()
                raise

    def update(self, user_id:str, note:NoteVO) -> NoteVO:
        with SessionLocal() as db:
            try:
                existing_note = self._find_owned(db, user_id, note.id)

                existing_note.title = note.title
                existing_note.content = note.content
                existing_note.memo_date = note.memo_date
                existing_note.updated_at = note.updated_at
                #리스트를 통째로 대입하면 기존 연결은 지워지고 새 연결만 남는다.
                #Note가 애그리게이트 루트라서 태그는 항상 통째로 갈아끼운다
                existing_note.tags = self._get_or_create_tags(db, note.tags)

                db.flush()
                self._delete_orphan_tags(db)  #연결이 끊겨 고아가 된 태그 정리
                db.commit()

                return self._to_vo(existing_note)
            except:
                db.rollback()
                raise

    def delete(self, user_id: str, id:str):
        with SessionLocal() as db:
            try:
                note = self._find_owned(db, user_id, id)

                db.delete(note)  #Note_Tag 연결 행은 함께 지워진다
                db.flush()
                self._delete_orphan_tags(db)
                db.commit()
            except:
                db.rollback()
                raise

    def delete_tags(self, user_id: str, id:str):
        """노트는 두고 태그 연결만 전부 끊는다"""
        with SessionLocal() as db:
            try:
                note = self._find_owned(db, user_id, id)

                note.tags = []
                db.flush()
                self._delete_orphan_tags(db)
                db.commit()
            except:
                db.rollback()
                raise

    def get_notes_by_tag_name(
            self,
            user_id: str,
            tag_name: str,
            page: int,
            items_per_page: int,
    ) -> tuple[int, list[NoteVO]]:
        with SessionLocal() as db:
            #join으로 연결 테이블을 타고 넘어가 태그명으로 거른다
            query = (
                db.query(Note)
                .join(Note.tags)
                .filter(Note.user_id == user_id, Tag.name == tag_name)
            )
            total_count = query.count()

            offset = (page - 1) * items_per_page
            notes = (
                query.order_by(Note.memo_date.desc(), Note.created_at.desc())
                .offset(offset)
                .limit(items_per_page)
                .all()
            )

            return total_count, [self._to_vo(note) for note in notes]
