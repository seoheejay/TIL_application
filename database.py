from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL

#접속 정보는 소스에 적지 않고 .env 에서 읽는다
engine = create_engine(
    DATABASE_URL,
    #MySQL은 wait_timeout(기본 8시간) 동안 놀고 있는 연결을 끊는다.
    #풀은 그 사실을 모른 채 죽은 연결을 건네주고, 첫 쿼리에서 500이 난다.
    #pre_ping은 꺼내 쓰기 직전에 가볍게 확인하고, 죽었으면 조용히 새로 만든다
    pool_pre_ping=True,
    #그와 별개로 한 시간 지난 연결은 미리 갈아치운다.
    #wait_timeout보다 짧아야 의미가 있다
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
