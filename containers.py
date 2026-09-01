from dependency_injector import containers, providers

from user.application.user_service import UserService
from note.application.note_service import NoteService

from user.infra.repository.user_repo import UserRepository
from note.infra.repository.note_repo import NoteRepository

class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        packages=[
            "user",
            "note",
            ],  #의존성을 사용할 모듈을 선언한다. packages에 패키지 경로를 기술하면 해당 패키지 하위에 있는 모듈이 모두 포함된다.
    )

    #의존성을 제공할 모듈을 팩토리에 등록한다.
    user_repo = providers.Factory(UserRepository)
    user_service = providers.Factory(UserService, user_repo=user_repo)
    note_repo = providers.Factory(NoteRepository)
    note_service = providers.Factory(NoteService, note_repo=note_repo)