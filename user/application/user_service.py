from ulid import ULID
from datetime import datetime
from user.domain.user import User
#from user.infra.repository.user_repo import UserRepository
from user.domain.repository.user_repo import IUserRepository
from fastapi import HTTPException, status
from utils.crypto import Crypto
from common.auth import Role, create_access_token
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

    def update_user(
        self,
        user_id: str,
        name: str | None = None,
        password: str | None = None,
    ) -> User:
        user = self.user_repo.find_by_id(user_id)  #없으면 여기서 422

        if name:
            user.name = name
        if password:
            #평문을 그대로 담지 않는다. 저장 직전에 해싱하는 건 서비스의 책임
            user.password = self.crypto.encrypt(password)

        user.updated_at = datetime.now()

        return self.user_repo.update(user)

    def get_users(self, page: int, items_per_page: int) -> tuple[int, list[User]]:
        return self.user_repo.get_users(page, items_per_page)

    def login(self, email: str, password: str) -> str:
        user = self.user_repo.find_by_email(email)

        #verify는 평문과 저장된 해시를 비교한다. 해시는 되돌릴 수 없으므로 이 방향으로만 확인 가능
        if not self.crypto.verify(password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        #토큰에 user_id와 역할을 담는다. 이 값이 이후 모든 요청의 current_user가 된다.
        #아직 User 테이블에 role 컬럼이 없으므로 일반 로그인은 항상 USER로 발급한다.
        #(추후 role 컬럼을 두면 Role(user.role) 로 바꾸면 된다)
        return create_access_token(payload={"user_id": user.id}, role=Role.USER)

    def delete_user(self, user_id: str):
        return self.user_repo.delete(user_id)
