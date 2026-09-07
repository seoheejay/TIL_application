from abc import ABCMeta, abstractmethod
from user.domain.user import User

class IUserRepository(metaclass=ABCMeta):
    @abstractmethod #추상 클래스이므로 객체 직접 생성할 수 없다. 
    def save(self, user:User):
        #interface 함수 구현부는 Error 일으켜서 구현이 필요함을 기술
        raise NotImplementedError 

    @abstractmethod
    def find_by_email(self, email:str) -> User:
        """
        이메일로 유저 검색. 검색한 유저 없을 경우 422에러 발생시킴
        """
        raise NotImplementedError
    
    @abstractmethod
    def find_by_id(self, id:str) -> User:
        raise NotImplementedError

    @abstractmethod
    def update(self, user:User):
        raise NotImplementedError

    @abstractmethod
    def get_users(self, page:int, items_per_page:int) -> tuple[int, list[User]]:
        """(전체 개수, 현재 페이지 목록)"""
        raise NotImplementedError

    @abstractmethod
    def delete(self, id:str):
        raise NotImplementedError
