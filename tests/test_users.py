# -*- coding: utf-8 -*-
"""유저 API - 가입, 내 정보, 수정, 목록, 탈퇴"""
import pytest


class TestCreateUser:
    def test_회원가입에_성공한다(self, client):
        res = client.post("/users", json={"name": "정서희", "email": "a@example.com", "password": "password123"})

        assert res.status_code == 201
        assert res.json()["email"] == "a@example.com"

    def test_응답에_비밀번호가_포함되지_않는다(self, client):
        res = client.post("/users", json={"name": "정서희", "email": "a@example.com", "password": "password123"})

        assert "password" not in res.json()

    def test_이미_가입한_이메일이면_422(self, client, make_user):
        user, _ = make_user()
        res = client.post("/users", json={"name": "다른사람", "email": user["email"], "password": "password123"})

        assert res.status_code == 422

    @pytest.mark.parametrize("body, 이유", [
        ({"name": "정", "email": "a@example.com", "password": "password123"}, "이름이 2자 미만"),
        ({"name": "정서희", "email": "not-an-email", "password": "password123"}, "이메일 형식 아님"),
        ({"name": "정서희", "email": "a@example.com", "password": "1234"}, "비밀번호 8자 미만"),
        ({"name": "정서희", "email": "a@example.com"}, "비밀번호 누락"),
    ])
    def test_잘못된_입력은_400(self, client, body, 이유):
        assert client.post("/users", json=body).status_code == 400, 이유


class TestGetMe:
    def test_내_정보를_조회한다(self, client, make_user):
        user, headers = make_user(name="정서희")
        res = client.get("/users/me", headers=headers)

        assert res.status_code == 200
        assert res.json()["id"] == user["id"]
        assert res.json()["name"] == "정서희"

    def test_비밀번호는_노출되지_않는다(self, client, make_user):
        _, headers = make_user()

        assert "password" not in client.get("/users/me", headers=headers).json()

    def test_토큰이_없으면_401(self, client):
        assert client.get("/users/me").status_code == 401


class TestUpdateUser:
    def test_이름을_바꾼다(self, client, make_user):
        _, headers = make_user(name="이전이름")
        res = client.put("/users", headers=headers, json={"name": "새이름"})

        assert res.status_code == 200
        assert res.json()["name"] == "새이름"

    def test_이름만_보내면_비밀번호는_그대로다(self, client, make_user):
        user, headers = make_user()
        client.put("/users", headers=headers, json={"name": "새이름"})

        res = client.post("/users/login", data={"username": user["email"], "password": user["password"]})
        assert res.status_code == 200

    def test_비밀번호를_바꾸면_새_비밀번호로_로그인된다(self, client, make_user):
        user, headers = make_user()
        client.put("/users", headers=headers, json={"password": "newpassword123"})

        assert client.post("/users/login", data={"username": user["email"], "password": "newpassword123"}).status_code == 200
        assert client.post("/users/login", data={"username": user["email"], "password": user["password"]}).status_code == 401

    def test_메모를_저장하고_지운다(self, client, make_user):
        _, headers = make_user()

        assert client.put("/users", headers=headers, json={"memo": "관리자 메모"}).json()["memo"] == "관리자 메모"
        assert client.get("/users/me", headers=headers).json()["memo"] == "관리자 메모"
        # 빈 문자열은 "지운다"는 뜻
        assert client.put("/users", headers=headers, json={"memo": ""}).json()["memo"] == ""

    def test_토큰이_없으면_401(self, client):
        assert client.put("/users", json={"name": "새이름"}).status_code == 401

    def test_다른_유저의_정보는_바꿀_수_없다(self, client, make_user):
        """경로로 id를 받지 않고 토큰에서 꺼내므로 남의 계정을 지정할 방법이 없다"""
        victim, _ = make_user(name="피해자")
        _, attacker_headers = make_user(name="공격자")

        client.put("/users", headers=attacker_headers, json={"name": "탈취됨"})

        assert client.get("/users/me", headers=attacker_headers).json()["id"] != victim["id"]


class TestGetUsers:
    def test_어드민은_목록을_조회한다(self, client, make_user, admin_headers):
        make_user()
        make_user()
        res = client.get("/users", headers=admin_headers())

        assert res.status_code == 200
        assert res.json()["total_count"] == 2

    def test_페이지네이션이_동작한다(self, client, make_user, admin_headers):
        for _ in range(3):
            make_user()
        res = client.get("/users?page=1&items_per_page=2", headers=admin_headers())

        assert res.json()["total_count"] == 3
        assert len(res.json()["users"]) == 2

    @pytest.mark.parametrize("query", ["page=0", "page=-1", "items_per_page=0", "items_per_page=101"])
    def test_잘못된_페이지_인자는_400(self, client, admin_headers, query):
        assert client.get(f"/users?{query}", headers=admin_headers()).status_code == 400


class TestDeleteUser:
    def test_탈퇴하면_로그인할_수_없다(self, client, make_user):
        user, headers = make_user()

        assert client.delete("/users", headers=headers).status_code == 204
        assert client.post("/users/login", data={"username": user["email"], "password": user["password"]}).status_code == 422

    def test_탈퇴하면_내_노트도_함께_지워진다(self, client, make_user, make_note, admin_headers):
        """Note.user_id 의 FK ON DELETE CASCADE 가 동작하는지"""
        user, headers = make_user()
        make_note(headers)
        make_note(headers, title="두번째")

        client.delete("/users", headers=headers)

        import database
        from sqlalchemy import text
        with database.engine.connect() as conn:
            남은노트 = conn.execute(text("SELECT COUNT(*) FROM Note WHERE user_id=:u"), {"u": user["id"]}).scalar()
        assert 남은노트 == 0

    def test_토큰이_없으면_401(self, client):
        assert client.delete("/users").status_code == 401
