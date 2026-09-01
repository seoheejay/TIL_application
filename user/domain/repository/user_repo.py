from abc import ABCMeta, abstractmethod
from user.domain.user import User


class IUserRepository(metaclass=ABCMeta):
    @abstractmethod
    def save(self, user: User):
        raise NotImplementedError

    @abstractmethod
    def find_by_email(self, email: str) -> User:
        """이메일로 유저 검색. 없으면 422 에러."""
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, id: str) -> User:
        raise NotImplementedError

    @abstractmethod
    def update(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_users(self) -> list[User]:
        raise NotImplementedError