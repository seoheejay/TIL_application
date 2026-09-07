from datetime import datetime
from dataclasses import asdict
from typing import Annotated
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from common.auth import CurrentUser, get_current_user
from containers import Container
from note.domain.note import Note
from note.application.note_service import NoteService

router = APIRouter(prefix="/notes")

#태그 한 개에 적용할 제약. 여러 모델에서 재사용한다
TagName = Annotated[str, Field(min_length=1, max_length=32)]

class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    memo_date: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

class GetNotesResponse(BaseModel):
    total_count: int
    page: int
    notes: list[NoteResponse]

class CreateNoteBody(BaseModel):
    #str만 붙이면 "문자열이면 통과" -> 따라서 Field 붙여 길이 조건 추가시킴
    title: str = Field(min_length=1, max_length=64)
    content: str= Field(min_length=1)
    memo_date: str = Field(min_length=8, max_length=8)
    #list 자체에 min/max_length를 걸면 "원소 개수" 제한이 된다.
    #태그 한 개의 길이를 제한하려면 원소 타입쪽에 Annotated로 건다 (DB의 Tag.name도 32자)
    tags: list[TagName] | None = Field(default=None)

class UpdateNoteBody(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=64)
    content: str | None = Field(default=None, min_length=1)
    memo_date: str | None = Field(default=None, min_length=8, max_length=8)
    #None이면 태그를 건드리지 않고, []를 보내면 전부 지운다
    tags: list[TagName] | None = Field(default=None)


def _to_response(note: Note) -> dict:
    """
    도메인의 tags는 Tag 객체 리스트인데 응답의 tags는 문자열 리스트다.
    이 모양 차이를 흡수하는 게 인터페이스 계층의 일. 세 라우터가 같은 변환을 쓰므로 함수로 뺐다
    """
    response = asdict(note)                                        #dataclass를 dictionary로 바꿈
    response.update({"tags": [tag.name for tag in note.tags]})     #리스트 컴프리헨션으로 이름만 뽑아냄
    return response


@router.post("", status_code=201, response_model=NoteResponse)
@inject
def create_note(
    #get_current_user는 JWT 토큰을 검사해서 지금 로그인한 사람을 돌려주는 함수임. Depends로 걸어두면 fastapi가 라우터 함수 실행 전에 이걸 먼저 부르고, 토큰이 없거나 잘못됐으면 401로 막음
    #기본값이 없는 인자라 앞에 와야 함. 
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    body: CreateNoteBody,
    note_service: NoteService = Depends(Provide[Container.note_service])
):
    note = note_service.create_note(
        #클라이언트가 보낸 값이 아니라 토큰에서 꺼낸 id를 쓴다. 남의 이름으로 쓰기를 막는 지점
        user_id = current_user.id,
        title = body.title,
        content = body.content,
        memo_date = body.memo_date,
        tag_names = body.tags if body.tags else [],
    )

    return _to_response(note)


@router.get("", response_model=GetNotesResponse)
@inject
def get_notes(
    page: int = 1,
    items_per_page: int  = 10,
    current_user: CurrentUser = Depends(get_current_user),
    note_service: NoteService = Depends(Provide[Container.note_service]),
): 
    total_count, notes = note_service.get_notes(
        user_id =current_user.id,
        page = page,
        items_per_page = items_per_page,
    )

    return {
        "total_count" : total_count,
        "page" : page,
        "notes" : [_to_response(note) for note in notes],
    }


@router.get("/tags/{tag_name}", response_model=GetNotesResponse)
@inject
def get_notes_by_tag(
    tag_name: str,
    page: int = 1,
    items_per_page: int = 10,
    current_user: CurrentUser = Depends(get_current_user),
    note_service: NoteService = Depends(Provide[Container.note_service]),
):
    #주의: 이 라우터는 "/{id}" 보다 위에 있어야 한다.
    #아래에 두면 /notes/tags/회의 요청이 id="tags" 로 먼저 잡힌다. FastAPI는 선언 순서대로 매칭한다
    total_count, notes = note_service.get_notes_by_tag(
        user_id = current_user.id,
        tag_name = tag_name,
        page = page,
        items_per_page = items_per_page,
    )

    return {
        "total_count" : total_count,
        "page" : page,
        "notes" : [_to_response(note) for note in notes],
    }


@router.get("/{id}", response_model = NoteResponse)
@inject
def get_note(
    id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    note_service: NoteService = Depends(Provide[Container.note_service]),
):
    note = note_service.get_note(
        user_id = current_user.id,
        id = id
    )

    return _to_response(note)


@router.put("/{id}", response_model=NoteResponse)
@inject
def update_note(
    id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    body: UpdateNoteBody,
    note_service: NoteService = Depends(Provide[Container.note_service]),
):
    note = note_service.update_note(
        user_id = current_user.id,
        id = id,
        title = body.title,
        content = body.content,
        memo_date = body.memo_date,
        tag_names = body.tags,
    )

    return _to_response(note)


@router.delete("/{id}", status_code=204)
@inject
def delete_note(
    id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    note_service: NoteService = Depends(Provide[Container.note_service]),
):
    #204는 본문이 없는 응답이다. 그래서 아무것도 return 하지 않는다
    note_service.delete_note(user_id=current_user.id, id=id)


@router.delete("/{id}/tags", status_code=204)
@inject
def delete_note_tags(
    id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    note_service: NoteService = Depends(Provide[Container.note_service]),
):
    note_service.delete_note_tags(user_id=current_user.id, id=id)
