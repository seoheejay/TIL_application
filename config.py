"""
환경별로 달라지는 값을 한 곳에 모은다.

비밀번호나 시크릿 키를 소스에 적으면 git에 그대로 올라간다.
그래서 값 자체는 .env 파일에 두고(=git에 안 올라감), 여기서는 이름으로만 읽는다.
처음 받았다면 .env.example 을 .env 로 복사해서 값을 채우면 된다.
"""
import os

from dotenv import load_dotenv

# 프로젝트 루트의 .env 를 읽어 환경변수로 올린다.
# 이미 OS에 설정된 환경변수가 있으면 그쪽이 우선한다(운영에서 덮어쓰기 쉽도록)
load_dotenv()


def _required(key: str) -> str:
    """없으면 무엇을 어떻게 채워야 하는지 알려주고 멈춘다. 조용히 기본값을 쓰지 않는다"""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"환경변수 {key} 가 설정되지 않았습니다.\n"
            f"  .env.example 을 .env 로 복사한 뒤 {key} 값을 채워주세요.\n"
            f"  (예: cp .env.example .env)"
        )
    return value


DATABASE_URL = _required("DATABASE_URL")
JWT_SECRET_KEY = _required("JWT_SECRET_KEY")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "6"))

# 프론트엔드가 다른 포트에서 뜨면 브라우저가 요청을 막는다(CORS).
# 배포 도메인처럼 정확히 지정해야 하는 출처를 쉼표로 구분해 적는다
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

# 로컬 개발 중에는 프론트 포트가 자주 바뀐다(5173, 3000, 8000 …).
# localhost / 127.0.0.1 이면 포트를 가리지 않고 허용해서 매번 목록을 고치지 않게 한다.
# 외부 도메인은 여전히 막히므로 로컬 개발용으로는 안전하다.
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
)
