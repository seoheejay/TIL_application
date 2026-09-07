from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field

from user.application.user_service import UserService
from typing import Annotated

from dependency_injector.wiring import inject,Provide
from containers import Container
from common.auth import CurrentUser, Role, get_admin_user, get_current_user

from fastapi.security import OAuth2PasswordRequestForm

from datetime import datetime

#fastapi가 제공하는 APIRouter 객체를 생성한다. 유저 앱은 대부분 유저 엔티티를 다루는 기능을 가진다.
#따라서 api 경로에 /users로 시작하도록 한다.
router = APIRouter(prefix="/users")

class UserResponse(BaseModel):
    id:str
    name:str
    email:str
    created_at:datetime
    updated_at: datetime
    #password는 일부러 넣지 않는다. response_model이 없는 필드를 잘라내므로 해시가 밖으로 새지 않는다

#파이단틱의 BaseModel 상속받아 파이단틱 모델 선언
class CreateUserBody(BaseModel):
    name:str = Field(min_length=2, max_length=32)
    email:EmailStr = Field(max_length=64)
    password:str = Field(min_length=8, max_length=32)

class UpdateUserBody(BaseModel):
    name: str|None = Field(default=None, min_length=2, max_length=32)
    password: str|None = Field(default=None, min_length=8, max_length=32)

class GetUsersResponse(BaseModel):
    total_count: int
    page: int
    users: list[UserResponse]

@router.post("", status_code=201, response_model=UserResponse)
@inject
#FastAPI는 라우터의 경로와 메서드에 따라 요청 매개변수나 본문을 라우터에 전달한다.
#따라서 위에서 선언한 파이단틱 CreateUserBody 모델이 라우터 함수의 인수로 주입된다.
def create_user( #UserService를 의존성으로 주입
    user: CreateUserBody,
    #user_service: Annotated[UserService, Depends(UserService)] #파이썬에서 제공하는 Annotated를 이용해 user_service 인수 타입이 UserService임을 나타냄
    user_service: UserService = Depends(Provide[Container.user_service])
    ):

    created_user = user_service.create_user( #UserService를 직접 생성하는게 아닌, 주입받은 객체 사용
        name=user.name,
        email=user.email,
        password=user.password
    )
    return created_user

@router.post("/login")
@inject
def login(
    #OAuth2PasswordRequestForm은 JSON이 아니라 폼(form-data)으로 받는다.
    #필드 이름이 username으로 고정되어 있어서 여기에 이메일을 담는다. 스웨거 Authorize 버튼이 이 규약을 따른다
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    user_service: UserService = Depends(Provide[Container.user_service]),
):
    access_token = user_service.login(
        email=form_data.username,
        password=form_data.password,
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("", response_model=GetUsersResponse)
@inject
def get_users(
    page: Annotated[int, Query(ge=1)] = 1,
    items_per_page: Annotated[int, Query(ge=1, le=100)] = 10,
    #get_current_user가 아니라 get_admin_user다.
    #TIL 서비스에서 전체 유저 목록은 어드민만 볼 수 있다. 토큰의 role이 ADMIN이 아니면 403
    current_user: CurrentUser = Depends(get_admin_user),
    user_service: UserService = Depends(Provide[Container.user_service]),
):
    total_count, users = user_service.get_users(page, items_per_page)

    return {
        "total_count": total_count,
        "page": page,
        "users": users,
    }

@router.put("", response_model=UserResponse)
@inject
def update_user(
    #경로에서 user_id를 받지 않고 토큰에서 꺼낸다.
    #클라이언트가 보낸 id를 믿으면 남의 계정 비밀번호를 바꿀 수 있게 된다
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    body: UpdateUserBody,
    user_service: UserService = Depends(Provide[Container.user_service]),
    ):
    user = user_service.update_user(
        user_id=current_user.id,
        name=body.name,
        password=body.password,
    )
    return user


@router.delete("", status_code=204)
@inject
def delete_user(
    #탈퇴도 본인만 가능하다. 경로로 id를 받지 않고 토큰에서 꺼낸다
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    user_service: UserService = Depends(Provide[Container.user_service]),
):
    #204는 본문이 없는 응답이다. 그래서 아무것도 return 하지 않는다
    user_service.delete_user(user_id=current_user.id)
