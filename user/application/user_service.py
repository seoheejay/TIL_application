from ulid import ULID
from datetime import datetime
from user.domain.user import User
#from user.infra.repository.user_repo import UserRepository
from user.domain.repository.user_repo import IUserRepository
from fastapi import HTTPException
from utils.crypto import Crypto
#from containers import Container 서비스는 컨테이너를 알면 안됨. 의존성 주입 요점은 객체가 자기를 누가 조립하는지 몰라도 되게 만드는 것. 

class UserService:
    def __init__(
        self,
        user_repo: IUserRepository):
        self.user_repo = user_repo
        self.ulid = ULID()
        self.crypto = Crypto()

    def create_user(self, name: str, email:str, password: str):
        _user = None #db에서 찾은 유저 변수. 새로 생성할 유저와 구분하기 위해 _ 붙임

        try:
            _user = self.user_repo.find_by_email(email)
        except HTTPException as e:
            if e.status_code != 422:
                raise e

        #이미 가입한 유저일 경우 다시 422에러 일으킨다
        if _user:
            raise HTTPException(status_code=422) 
        
        now = datetime.now()
        user: User = User( #User 도메인 객체 생성
            id=self.ulid.generate(),
            name=name,
            email=email,
            #password=password,
            password=self.crypto.encrypt(password),
            created_at=now,
            updated_at=now,
        )
        self.user_repo.save(user) #생성된 객체를 저장소로 전달
        return user
