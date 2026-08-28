from fastapi import APIRouter
from pydantic import BaseModel

from user.application.user_service import UserService

#fastapi가 제공하는 APIRouter 객체를 생성한다. 유저 앱은 대부분 유저 엔티티를 다루는 기능을 가진다.
#따라서 api 경로에 /users로 시작하도록 한다.
router = APIRouter(prefix="/users")

#파이단틱의 BaseModel 상속받아 파이단틱 모델 선언
class CreateUserBody(BaseModel):
    name:str
    email:str
    password:str


@router.post("", status_code=201)
#FastAPI는 라우터의 경로와 메서드에 따라 요청 매개변수나 본문을 라우터에 전달한다.
#따라서 위에서 선언한 파이단틱 CreateUserBody 모델이 라우터 함수의 인수로 주입된다.
def create_user(user:CreateUserBody):
    #애플리케이션 계층에 있는 UserService 객체를 만들고 유저 생성 유스 케이스 함수를 호출한다. 인터페이스 계층은 애플리케이션 계층에 의존해도 된다.
    user_service = UserService()
    create_user = user_service.create_user(
        name=user.name,
        email=user.email,
        password=user.password
    )
    return create_user #아직 인프라 계층 구현 안되어 있어서, 이 상태에서 요청 보내면 error 발생함