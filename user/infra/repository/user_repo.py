from user.domain.repository.user_repo import IUserRepository
from database import SessionLocal
from user.domain.user import User as UserVO
from user.infra.db_models.user import User
#User는 DB table, UserVO(Value Object)는 도메인 객체
from fastapi import HTTPException
from utils.db_utils import row_to_dict

class UserRepository(IUserRepository):
    def save(self, user: UserVO):
        new_user = User(    #유저 db 모델 객체 생성
            id = user.id,
            email = user.email,
            name = user.name,
            password = user.password,
            memo = user.memo,
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
        # **구문은 파이썬에서 제공하는 가변 키워드를 다룰 때 사용하는 구문
        return UserVO(**row_to_dict(user))
    
    def find_by_id(self, id: str):
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == id).first()
        if not user:
            raise HTTPException(status_code=422)
        return UserVO(**row_to_dict(user))

    def update(self, user_vo: UserVO):
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_vo.id).first()
            if not user:
                raise HTTPException(status_code=422)
            user.name = user_vo.name
            user.password = user_vo.password
            db.add(user)
            db.commit()
        return user

    def get_users(self) -> list[UserVO]:
        with SessionLocal() as db:
            users = db.query(User).all()
        return [UserVO(**row_to_dict(user)) for user in users]