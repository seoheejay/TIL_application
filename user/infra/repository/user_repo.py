from user.domain.repository.user_repo import IUserRepository
from database import SessionLocal
from user.domain.user import User as UserVO
from user.infra.db_models.user import User

class UserRepository(IUserRepository):
    def save(self, user: userVO):
        new_user = User(
            id = user.id,
            email = user.email,
            #구현예정
            
        )