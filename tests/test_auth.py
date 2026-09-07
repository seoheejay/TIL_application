# -*- coding: utf-8 -*-
"""인증(로그인/토큰)과 인가(역할별 권한) 검증"""
import datetime

import jwt
import pytest

from common.auth import ALGORITHM, SECRET_KEY, Role, create_access_token


def _token(payload: dict, secret: str = SECRET_KEY, hours: int = 1) -> str:
    body = {**payload, "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=hours)}
    return jwt.encode(body, secret, algorithm=ALGORITHM)


class TestLogin:
    def test_로그인_성공시_bearer_토큰을_받는다(self, client, make_user):
        user, _ = make_user()
        res = client.post("/users/login", data={"username": user["email"], "password": user["password"]})

        assert res.status_code == 200
        assert res.json()["token_type"] == "bearer"
        assert res.json()["access_token"]

    def test_토큰에_user_id와_role이_담긴다(self, client, make_user):
        user, headers = make_user()
        token = headers["Authorization"].removeprefix("Bearer ")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        assert payload["user_id"] == user["id"]
        assert payload["role"] == Role.USER    # 일반 로그인은 항상 USER

    def test_비밀번호가_틀리면_401(self, client, make_user):
        user, _ = make_user()
        res = client.post("/users/login", data={"username": user["email"], "password": "wrong-password"})

        assert res.status_code == 401

    def test_없는_이메일이면_422(self, client):
        res = client.post("/users/login", data={"username": "nobody@example.com", "password": "password123"})

        assert res.status_code == 422


class TestTokenValidation:
    @pytest.mark.parametrize("path", ["/notes", "/users/me"])
    def test_토큰이_없으면_401(self, client, path):
        assert client.get(path).status_code == 401

    def test_형식이_깨진_토큰은_401(self, client):
        res = client.get("/notes", headers={"Authorization": "Bearer not.a.jwt"})

        assert res.status_code == 401

    def test_다른_키로_서명한_토큰은_401(self, client):
        forged = _token({"user_id": "x", "role": "ADMIN"}, secret="attacker-secret-guess")
        res = client.get("/users", headers={"Authorization": f"Bearer {forged}"})

        assert res.status_code == 401

    def test_만료된_토큰은_401(self, client):
        expired = _token({"user_id": "x", "role": "USER"}, hours=-1)
        res = client.get("/notes", headers={"Authorization": f"Bearer {expired}"})

        assert res.status_code == 401

    def test_role이_없는_토큰은_401(self, client):
        res = client.get("/notes", headers={"Authorization": f"Bearer {_token({'user_id': 'x'})}"})

        assert res.status_code == 401

    def test_모르는_role_값은_401(self, client):
        res = client.get("/notes", headers={"Authorization": f"Bearer {_token({'user_id': 'x', 'role': 'SUPERADMIN'})}"})

        assert res.status_code == 401


class TestAdminOnly:
    def test_일반_유저는_유저목록을_볼_수_없다(self, client, make_user):
        _, headers = make_user()
        res = client.get("/users", headers=headers)

        assert res.status_code == 403   # 누군지는 알지만 권한이 없다

    def test_어드민_토큰이면_유저목록을_본다(self, client, make_user, admin_headers):
        make_user()
        res = client.get("/users", headers=admin_headers())

        assert res.status_code == 200
        assert res.json()["total_count"] >= 1

    def test_어드민_토큰은_로그인으로는_발급되지_않는다(self, client, make_user):
        """로그인 토큰으로 어드민 API를 부르면 막혀야 한다"""
        _, headers = make_user()

        assert client.get("/users", headers=headers).status_code == 403

    def test_어드민도_일반_API를_쓸_수_있다(self, client, admin_headers):
        assert client.get("/notes", headers=admin_headers()).status_code == 200
