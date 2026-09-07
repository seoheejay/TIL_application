# -*- coding: utf-8 -*-
"""노트 API - 생성, 조회, 태그, 수정, 삭제, 소유권"""
import pytest


class TestCreateNote:
    def test_노트를_만든다(self, client, make_user):
        _, headers = make_user()
        res = client.post("/notes", headers=headers, json={
            "title": "오늘 배운 것", "content": "FastAPI 4계층", "memo_date": "20260907",
        })

        assert res.status_code == 201
        assert res.json()["title"] == "오늘 배운 것"
        assert res.json()["tags"] == []

    def test_태그는_문자열_리스트로_응답된다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["TIL", "FastAPI"])

        assert sorted(note["tags"]) == ["FastAPI", "TIL"]
        assert all(isinstance(t, str) for t in note["tags"])

    def test_중복된_태그는_한_번만_저장된다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["회의", "정리", "회의"])

        assert sorted(note["tags"]) == ["정리", "회의"]

    def test_user_id는_토큰에서_결정된다(self, client, make_user):
        """본문으로 남의 user_id를 보내도 무시된다"""
        user, headers = make_user()
        res = client.post("/notes", headers=headers, json={
            "title": "t", "content": "c", "memo_date": "20260907", "user_id": "SOMEONE_ELSE",
        })

        assert res.json()["user_id"] == user["id"]

    def test_토큰이_없으면_401(self, client):
        res = client.post("/notes", json={"title": "t", "content": "c", "memo_date": "20260907"})

        assert res.status_code == 401

    @pytest.mark.parametrize("body, 이유", [
        ({"title": "", "content": "c", "memo_date": "20260907"}, "제목이 비었음"),
        ({"title": "x" * 65, "content": "c", "memo_date": "20260907"}, "제목 64자 초과"),
        ({"title": "t", "content": "", "memo_date": "20260907"}, "본문이 비었음"),
        ({"title": "t", "content": "c", "memo_date": "2026"}, "memo_date 길이 오류"),
        ({"title": "t", "content": "c", "memo_date": "abcdefgh"}, "memo_date 가 날짜가 아님"),
        ({"title": "t", "content": "c", "memo_date": "20260231"}, "2월 31일은 없는 날짜"),
        ({"title": "t", "content": "c", "memo_date": "20260907", "tags": ["x" * 33]}, "태그 32자 초과"),
    ])
    def test_잘못된_입력은_400(self, client, make_user, body, 이유):
        _, headers = make_user()

        assert client.post("/notes", headers=headers, json=body).status_code == 400, 이유

    def test_아주_긴_본문도_저장된다(self, client, make_user):
        """content 컬럼이 MEDIUMTEXT 라 TEXT 한계(65,535바이트)를 넘겨도 들어간다"""
        _, headers = make_user()
        res = client.post("/notes", headers=headers, json={
            "title": "긴 글", "content": "가" * 30000, "memo_date": "20260907",
        })

        assert res.status_code == 201
        assert len(res.json()["content"]) == 30000


class TestGetNotes:
    def test_내_노트만_보인다(self, client, make_user, make_note):
        _, mine = make_user()
        _, others = make_user()
        make_note(mine, title="내 노트")
        make_note(others, title="남의 노트")

        res = client.get("/notes", headers=mine)

        assert res.json()["total_count"] == 1
        assert res.json()["notes"][0]["title"] == "내 노트"

    def test_memo_date_내림차순으로_정렬된다(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="오래된", memo_date="20260101")
        make_note(headers, title="최신", memo_date="20261231")

        titles = [n["title"] for n in client.get("/notes", headers=headers).json()["notes"]]

        assert titles == ["최신", "오래된"]

    def test_페이지네이션이_동작한다(self, client, make_user, make_note):
        _, headers = make_user()
        for i in range(5):
            make_note(headers, title=f"노트{i}")

        res = client.get("/notes?page=2&items_per_page=2", headers=headers)

        assert res.json()["total_count"] == 5
        assert len(res.json()["notes"]) == 2

    @pytest.mark.parametrize("query", [
        "page=0", "page=-1", "items_per_page=0", "items_per_page=-5", "items_per_page=101",
    ])
    def test_잘못된_페이지_인자는_400(self, client, make_user, query):
        """예전에는 offset이 음수가 되어 500이 났다"""
        _, headers = make_user()

        assert client.get(f"/notes?{query}", headers=headers).status_code == 400

    def test_단건_조회(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["TIL"])

        res = client.get(f"/notes/{note['id']}", headers=headers)

        assert res.status_code == 200
        assert res.json()["tags"] == ["TIL"]

    def test_없는_노트는_404(self, client, make_user):
        _, headers = make_user()

        assert client.get("/notes/NOT_EXIST", headers=headers).status_code == 404


class TestTags:
    def test_태그로_검색한다(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="A", tags=["TIL", "회고"])
        make_note(headers, title="B", tags=["TIL"])
        make_note(headers, title="C", tags=["잡담"])

        assert client.get("/notes/tags/TIL", headers=headers).json()["total_count"] == 2
        assert client.get("/notes/tags/잡담", headers=headers).json()["total_count"] == 1
        assert client.get("/notes/tags/없는태그", headers=headers).json()["total_count"] == 0

    def test_같은_태그를_쓰는_남의_노트는_섞이지_않는다(self, client, make_user, make_note):
        """태그 행은 전역 공유되지만 검색은 user_id로도 걸린다"""
        _, mine = make_user()
        _, others = make_user()
        make_note(mine, title="내 것", tags=["공통"])
        make_note(others, title="남의 것", tags=["공통"])

        res = client.get("/notes/tags/공통", headers=mine)

        assert res.json()["total_count"] == 1
        assert res.json()["notes"][0]["title"] == "내 것"

    def test_태그만_비운다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["TIL", "회고"])

        assert client.delete(f"/notes/{note['id']}/tags", headers=headers).status_code == 204
        assert client.get(f"/notes/{note['id']}", headers=headers).json()["tags"] == []

    def test_아무도_안_쓰는_태그는_정리된다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["일회용"])
        client.delete(f"/notes/{note['id']}", headers=headers)

        import database
        from sqlalchemy import text
        with database.engine.connect() as conn:
            남은태그 = conn.execute(text("SELECT COUNT(*) FROM Tag WHERE name='일회용'")).scalar()

        assert 남은태그 == 0


class TestUpdateNote:
    def test_제목만_바꾸면_나머지는_유지된다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, content="원래 본문", tags=["TIL"])

        res = client.put(f"/notes/{note['id']}", headers=headers, json={"title": "새 제목"})

        assert res.json()["title"] == "새 제목"
        assert res.json()["content"] == "원래 본문"
        assert res.json()["tags"] == ["TIL"]

    def test_태그를_통째로_교체한다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["이전"])

        res = client.put(f"/notes/{note['id']}", headers=headers, json={"tags": ["이후"]})

        assert res.json()["tags"] == ["이후"]
        assert client.get("/notes/tags/이전", headers=headers).json()["total_count"] == 0

    def test_빈_태그_리스트는_전부_제거한다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["TIL"])

        res = client.put(f"/notes/{note['id']}", headers=headers, json={"tags": []})

        assert res.json()["tags"] == []

    def test_수정하면_updated_at이_갱신된다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers)

        res = client.put(f"/notes/{note['id']}", headers=headers, json={"title": "변경"})

        assert res.json()["updated_at"] >= note["updated_at"]

    def test_없는_노트는_404(self, client, make_user):
        _, headers = make_user()

        assert client.put("/notes/NOT_EXIST", headers=headers, json={"title": "x"}).status_code == 404


class TestOwnership:
    """노트 id를 알아도 남의 노트에는 손댈 수 없어야 한다"""

    @pytest.fixture
    def 남의_노트(self, make_user, make_note):
        _, owner = make_user()
        return make_note(owner, title="남의 노트")

    def test_조회할_수_없다(self, client, make_user, 남의_노트):
        _, attacker = make_user()

        assert client.get(f"/notes/{남의_노트['id']}", headers=attacker).status_code == 404

    def test_수정할_수_없다(self, client, make_user, 남의_노트):
        _, attacker = make_user()

        res = client.put(f"/notes/{남의_노트['id']}", headers=attacker, json={"title": "탈취"})

        assert res.status_code == 404

    def test_삭제할_수_없다(self, client, make_user, 남의_노트):
        _, attacker = make_user()

        assert client.delete(f"/notes/{남의_노트['id']}", headers=attacker).status_code == 404


class TestDeleteNote:
    def test_삭제하면_조회되지_않는다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers)

        assert client.delete(f"/notes/{note['id']}", headers=headers).status_code == 204
        assert client.get(f"/notes/{note['id']}", headers=headers).status_code == 404

    def test_없는_노트는_404(self, client, make_user):
        _, headers = make_user()

        assert client.delete("/notes/NOT_EXIST", headers=headers).status_code == 404
