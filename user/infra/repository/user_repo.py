from user.domain.repository.user_repo import IUserRepository
from database import SessionLocal
from user.domain.user import User as UserVO
from user.infra.db_models.user import User
from fastapi import HTTPException
from utils.db_utils import row_to_dict

class UserRepository(IUserRepository):
    def save(self, user: userVO):
        new_user = User(    #유저 db 모델 객체 생성
            id = user.id,
            email = user.email,
            name = user.name,
            password = user.password,
            created_at = user.created_at,
            updated_at = user.updated_at,
        )

        #with 구문 사용해 세션이 자동으로 닫히도록
        with SessionLocal() as db:
            try:
                db = SessionLocal() #만들어뒀던 SessionLocal 이용해 새로운 세션 생성
                db.add(new_user) #새로만든 유저 저장
                db.commit() #db에 커밋
            finally:
                db.close() #명시적으로 닫기
    def find_by_email(self, email:str) -> UserVO:
        with SessionLocal() as db:
            #sqlalchemy로 인수로 전달받은 email을 가지는 유저를 찾는다. 없을 경우 None 반환
            user = db.query(User).filter(User.email == email).first()

        if not user:
            raise HTTPException(status_code = 422)
        return UserVO(**row_to_dict(user))