from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

# Note와 Tag를 잇는 연결 테이블(다대다).
# 이 테이블만 있는 엔티티는 도메인에 대응물이 없다. 순수하게 인프라의 사정이다.
note_tag_association = Table(
    "Note_Tag",
    Base.metadata,
    Column("note_id", String(36), ForeignKey("Note.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("Tag.id", ondelete="CASCADE"), primary_key=True),
)


class Note(Base):
    __tablename__ = "Note"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    #내 노트만 조회하는 쿼리가 대부분이라 인덱스를 건다.
    #ondelete="CASCADE" : 유저가 탈퇴하면 그 사람의 노트도 DB가 함께 지운다.
    #이게 없으면 탈퇴 후에도 주인 없는 노트가 테이블에 남는다
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(64), nullable=False)
    #TEXT는 65,535바이트뿐이라 긴 노트에서 넘친다(한글은 글자당 3~4바이트).
    #MEDIUMTEXT는 약 16MB
    content: Mapped[str] = mapped_column(MEDIUMTEXT, nullable=False)
    memo_date: Mapped[str] = mapped_column(String(8), nullable=False, index=True)  # "20260907"
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # lazy="selectin" : Note를 가져온 직후 태그를 별도 SELECT 한 방으로 채운다.
    #   - joined(JOIN)를 쓰면 LIMIT이 조인된 행 수에 걸려서 페이지네이션이 깨진다
    #   - 기본값(lazy="select")을 쓰면 세션이 닫힌 뒤 note.tags 접근 시 DetachedInstanceError가 난다
    tags: Mapped[list["Tag"]] = relationship(
        secondary=note_tag_association,
        back_populates="notes",
        lazy="selectin",
    )


class Tag(Base):
    __tablename__ = "Tag"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    #같은 이름의 태그는 DB에 하나만 존재한다. 재사용 규칙을 DB 제약으로도 못 박아둔다
    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    notes: Mapped[list["Note"]] = relationship(
        secondary=note_tag_association,
        back_populates="tags",
    )
