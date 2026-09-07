# -*- coding: utf-8 -*-
"""
테스트 공용 설정.

핵심: 개발용 DB를 건드리지 않도록 **별도의 테스트 DB**를 쓴다.
config.py 가 import 시점에 환경변수를 읽으므로, 앱을 import 하기 **전에**
DATABASE_URL 을 테스트 DB 로 바꿔놓는 것이 중요하다.
(load_dotenv 는 이미 설정된 환경변수를 덮어쓰지 않는다)
"""
import os
import uuid

import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

load_dotenv()

# 개발 DB URL 에서 데이터베이스 이름만 "<이름>_test" 로 바꿔 쓴다.
# .env 에 TEST_DATABASE_URL 을 두면 그 값이 우선한다
_dev_url = os.environ.get("DATABASE_URL")
if not _dev_url:
    raise RuntimeError(".env 에 DATABASE_URL 이 필요합니다 (.env.example 참고)")

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    _u = make_url(_dev_url)
    # str(URL) 은 비밀번호를 "***" 로 가려버린다. 그대로 쓰면 접속이 거부된다
    TEST_DATABASE_URL = _u.set(database=f"{_u.database}_test").render_as_string(hide_password=False)

# ↓ 앱을 import 하기 전에 갈아끼운다. 이 순서가 깨지면 개발 DB 를 지우게 된다
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


def _create_test_database():
    """테스트 DB 가 없으면 만든다. 서버에는 붙되 특정 DB 는 지정하지 않고 접속한다"""
    url = make_url(TEST_DATABASE_URL)
    # database=None 은 "바꾸지 않음" 이라 DB명이 남는다. 빈 문자열이어야 서버에만 붙는다.
    # URL 객체를 그대로 넘겨야 비밀번호가 가려지지 않는다
    server = create_engine(url.set(database=""))
    with server.connect() as conn:
        conn.execute(text(
            f"CREATE DATABASE IF NOT EXISTS `{url.database}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        ))
    server.dispose()


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    _create_test_database()

    # 모델을 모두 import 해야 Base.metadata 에 테이블이 등록된다
    import database
    import note.infra.db_models.note  # noqa: F401
    import user.infra.db_models.user  # noqa: F401

    # 실수로 개발 DB 를 가리키고 있지 않은지 마지막으로 확인한다
    assert database.engine.url.database.endswith("_test"), (
        f"테스트가 개발 DB를 가리키고 있습니다: {database.engine.url.database}"
    )

    database.Base.metadata.create_all(bind=database.engine)
    yield
    database.Base.metadata.drop_all(bind=database.engine)


@pytest.fixture(autouse=True)
def _clean_tables(_setup_database):
    """
    테스트마다 빈 상태에서 시작한다.
    테이블을 지우고 다시 만드는 대신 데이터만 비워서 빠르게 돌린다
    """
    import database

    with database.engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in ["Note_Tag", "Note", "Tag", "User"]:
            conn.execute(text(f"TRUNCATE TABLE `{table}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    yield


@pytest.fixture
def client(_setup_database):
    from fastapi.testclient import TestClient
    from main import app

    # raise_server_exceptions=False 로 두면 500 도 응답으로 받아볼 수 있다
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------- 헬퍼
DEFAULT_PASSWORD = "password123"


@pytest.fixture
def make_user(client):
    """가입 + 로그인까지 해서 (유저정보, 인증헤더) 를 돌려준다"""
    def _make(name: str = "테스터", email: str | None = None, password: str = DEFAULT_PASSWORD):
        email = email or f"u_{uuid.uuid4().hex[:10]}@example.com"
        res = client.post("/users", json={"name": name, "email": email, "password": password})
        assert res.status_code == 201, res.text
        created = res.json()

        res = client.post("/users/login", data={"username": email, "password": password})
        assert res.status_code == 200, res.text
        token = res.json()["access_token"]

        return {**created, "email": email, "password": password}, {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture
def admin_headers():
    """어드민 토큰 헤더. 로그인으로는 발급되지 않으므로 직접 만든다"""
    def _make(user_id: str = "01ADMINUSERID"):
        from common.auth import Role, create_access_token
        return {"Authorization": f"Bearer {create_access_token({'user_id': user_id}, role=Role.ADMIN)}"}

    return _make


@pytest.fixture
def make_note(client):
    def _make(headers, title="테스트 노트", content="본문", memo_date="20260907", tags=None):
        body = {"title": title, "content": content, "memo_date": memo_date}
        if tags is not None:
            body["tags"] = tags
        res = client.post("/notes", headers=headers, json=body)
        assert res.status_code == 201, res.text
        return res.json()

    return _make
