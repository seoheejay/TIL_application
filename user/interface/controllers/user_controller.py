from fastapi import APIRouter, Depends
from pydantic import BaseModel

from user.application.user_service import UserService
from typing import Annotated

from dependency_injector.wiring import inject,Provide
from containers import Container

from datetime import datetime

#fastapi가 제공하는 APIRouter 객체를 생성한다. 유저 앱은 대부분 유저 엔티티를 다루는 기능을 가진다.
#따라서 api 경로에 /users로 시작하도록 한다.
router = APIRouter(prefix="/users")

#파이단틱의 BaseModel 상속받아 파이단틱 모델 선언
class CreateUserBody(BaseModel):
    name:str
    email:str
    password:str

class UpdateUser(BaseModel):
    name: str|None = None
    password: str|None = None

class UserResponse(BaseModel):
    id:str
    name:str
    email:str
    created_at:datetime
    updated_at: datetime

@router.post("", status_code=201, response_model=UserResponse)
@inject
#FastAPI는 라우터의 경로와 메서드에 따라 요청 매개변수나 본문을 라우터에 전달한다.
#따라서 위에서 선언한 파이단틱 CreateUserBody 모델이 라우터 함수의 인수로 주입된다.
def create_user( #UserService를 의존성으로 주입
    user: CreateUserBody,
    #user_service: Annotated[UserService, Depends(UserService)] #파이썬에서 제공하는 Annotated를 이용해 user_service 인수 타입이 UserService임을 나타냄
    user_service: UserService = Depends(Provide[Container.user_service])
    ):

    create_user = user_service.create_user( #UserService를 직접 생성하는게 아닌, 주입받은 객체 사용
        name=user.name,
        email=user.email,
        password=user.password
    )
    return create_user 

@router.put("/{user_id}", response_model=UserResponse)
@inject
def update_user(
    user_id: str,
    user:UpdateUser,
    user_service: UserService = Depends(Provide[Container.user_service]),
    ):

    updated_user = user_service.update_user(
        user_id=user_id,
        name = user.name,
        password=user.password,
    )
    return updated_user

@router.get("")
@inject
def get_users(
    user_service: UserService = Depends(Provide[Container.user_service]),
):
    users = user_service.get_users()
    return{
        "users":users,
    }