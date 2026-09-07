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
            created_at = user.created_at,
            updated_at = user.updated_at,
        )

        #with 구문 사용해 세션이 자동으로 닫히도록
        with SessionLocal() as db:
            try:
                db.add(new_user) #새로만든 유저 저장
                db.commit()      #db에 커밋
            except:
                db.rollback()    #실패하면 되돌린다. 안 그러면 세션이 더러운 채로 반납된다
                raise

    def find_by_email(self, email:str) -> UserVO:
        with SessionLocal() as db:
            #sqlalchemy로 인수로 전달받은 email을 가지는 유저를 찾는다. 없을 경우 None 반환
            user = db.query(User).filter(User.email == email).first()

            if not user:
                raise HTTPException(status_code = 422)
            # **구문은 파이썬에서 제공하는 가변 키워드를 다룰 때 사용하는 구문
            return UserVO(**row_to_dict(user))

    def find_by_id(self, id:str) -> UserVO:
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == id).first()

            if not user:
                raise HTTPException(status_code=422)

            return UserVO(**row_to_dict(user))

    def update(self, user: UserVO) -> UserVO:
        with SessionLocal() as db:
            #먼저 DB에서 꺼낸 뒤 필드를 바꾼다. 세션이 관리 중인 객체라 commit 시 UPDATE 문이 나간다
            existing_user = db.query(User).filter(User.id == user.id).first()

            if not existing_user:
                raise HTTPException(status_code=422)

            existing_user.name = user.name
            existing_user.password = user.password
            existing_user.memo = user.memo
            existing_user.updated_at = user.updated_at

            try:
                db.commit()
            except:
                db.rollback()
                raise

            #세션이 닫히기 전에 도메인 객체로 바꿔서 내보낸다
            return UserVO(**row_to_dict(existing_user))

    def get_users(self, page:int = 1, items_per_page:int = 10) -> tuple[int, list[UserVO]]:
        with SessionLocal() as db:
            query = db.query(User)
            total_count = query.count()  #페이지를 자르기 전 전체 개수

            offset = (page - 1) * items_per_page  #1페이지면 0번부터, 2페이지면 items_per_page번부터
            users = query.order_by(User.created_at.desc()).offset(offset).limit(items_per_page).all()

            return total_count, [UserVO(**row_to_dict(user)) for user in users]

    def delete(self, id:str):
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == id).first()

            if not user:
                raise HTTPException(status_code=422)

            try:
                db.delete(user)
                db.commit()
            except:
                db.rollback()
                raise
