# -*- coding: utf-8 -*-
"""노트 검색(GET /notes?search=)과 내 태그 목록(GET /notes/tags)"""
import pytest


class TestSearch:
    @pytest.fixture
    def 노트들(self, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="FastAPI 의존성 주입", content="Depends와 Provide", tags=["FastAPI"])
        make_note(headers, title="SQLAlchemy 세션", content="fastapi에서 세션 다루기", tags=["ORM"])
        make_note(headers, title="파이썬 컴프리헨션", content="리스트 만들기", tags=[])
        return headers

    def test_제목에서_찾는다(self, client, 노트들):
        res = client.get("/notes?search=SQLAlchemy", headers=노트들)

        assert res.status_code == 200
        assert [n["title"] for n in res.json()["notes"]] == ["SQLAlchemy 세션"]

    def test_본문에서도_찾는다(self, client, 노트들):
        res = client.get("/notes?search=Depends", headers=노트들)

        assert res.json()["total_count"] == 1
        assert res.json()["notes"][0]["title"] == "FastAPI 의존성 주입"

    def test_제목과_본문을_함께_본다(self, client, 노트들):
        """'FastAPI'는 1번 제목과 2번 본문에 있다"""
        res = client.get("/notes?search=fastapi", headers=노트들)

        assert res.json()["total_count"] == 2

    def test_대소문자를_가리지_않는다(self, client, 노트들):
        upper = client.get("/notes?search=FASTAPI", headers=노트들).json()["total_count"]
        lower = client.get("/notes?search=fastapi", headers=노트들).json()["total_count"]

        assert upper == lower == 2

    def test_한글도_찾는다(self, client, 노트들):
        res = client.get("/notes?search=컴프리헨션", headers=노트들)

        assert res.json()["total_count"] == 1

    def test_없는_말이면_0건(self, client, 노트들):
        res = client.get("/notes?search=존재하지않는말", headers=노트들)

        assert res.json()["total_count"] == 0
        assert res.json()["notes"] == []

    def test_search를_안_주면_전체가_나온다(self, client, 노트들):
        assert client.get("/notes", headers=노트들).json()["total_count"] == 3

    @pytest.mark.parametrize("blank", ["", "   "])
    def test_빈_검색어는_전체로_본다(self, client, 노트들, blank):
        res = client.get("/notes", params={"search": blank}, headers=노트들)

        assert res.json()["total_count"] == 3

    def test_앞뒤_공백은_무시한다(self, client, 노트들):
        res = client.get("/notes", params={"search": "  SQLAlchemy  "}, headers=노트들)

        assert res.json()["total_count"] == 1

    def test_total_count가_검색_결과_기준이다(self, client, make_user, make_note):
        """페이지네이션이 전체 개수가 아니라 걸러진 개수를 기준으로 해야 한다"""
        _, headers = make_user()
        for i in range(5):
            make_note(headers, title=f"찾을것{i}")
        for i in range(3):
            make_note(headers, title=f"다른것{i}")

        res = client.get("/notes?search=찾을것&page=1&items_per_page=2", headers=headers)

        assert res.json()["total_count"] == 5
        assert len(res.json()["notes"]) == 2

    def test_남의_노트는_검색되지_않는다(self, client, make_user, make_note):
        _, mine = make_user()
        _, others = make_user()
        make_note(mine, title="내 비밀 노트")
        make_note(others, title="내 비밀 노트")

        res = client.get("/notes?search=비밀", headers=mine)

        assert res.json()["total_count"] == 1

    @pytest.mark.parametrize("wildcard", ["%", "_", "%%", "a_b"])
    def test_LIKE_와일드카드가_전체를_긁어오지_않는다(self, client, make_user, make_note, wildcard):
        """
        이스케이프하지 않으면 "_"는 아무 한 글자, "%"는 아무 문자열에 걸려
        검색이 전체 조회가 되어 버린다.
        """
        _, headers = make_user()
        make_note(headers, title="가나다", content="라마바")

        res = client.get("/notes", params={"search": wildcard}, headers=headers)

        assert res.json()["total_count"] == 0

    def test_와일드카드를_글자로_찾을_수_있다(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="진행률 100% 달성")

        assert client.get("/notes", params={"search": "100%"}, headers=headers).json()["total_count"] == 1

    def test_토큰이_없으면_401(self, client):
        assert client.get("/notes?search=x").status_code == 401

    def test_너무_긴_검색어는_400(self, client, make_user):
        _, headers = make_user()

        assert client.get("/notes", params={"search": "x" * 65}, headers=headers).status_code == 400


class TestGetTags:
    def test_내_태그와_개수를_돌려준다(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="a", tags=["TIL", "FastAPI"])
        make_note(headers, title="b", tags=["TIL"])
        make_note(headers, title="c", tags=["TIL", "ORM"])

        res = client.get("/notes/tags", headers=headers)

        assert res.status_code == 200
        assert res.json()["tags"] == [
            {"name": "TIL", "count": 3},
            {"name": "FastAPI", "count": 1},
            {"name": "ORM", "count": 1},
        ]

    def test_많이_쓴_태그가_먼저_나온다(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, title="a", tags=["드문것"])
        make_note(headers, title="b", tags=["흔한것"])
        make_note(headers, title="c", tags=["흔한것"])

        names = [tag["name"] for tag in client.get("/notes/tags", headers=headers).json()["tags"]]

        assert names == ["흔한것", "드문것"]

    def test_태그가_없으면_빈_목록(self, client, make_user, make_note):
        _, headers = make_user()
        make_note(headers, tags=[])

        assert client.get("/notes/tags", headers=headers).json()["tags"] == []

    def test_남이_쓴_태그는_세지_않는다(self, client, make_user, make_note):
        """태그 행은 유저끼리 공유되지만 개수는 내 노트만 센다"""
        _, mine = make_user()
        _, others = make_user()
        make_note(mine, title="내것", tags=["공통"])
        make_note(others, title="남것1", tags=["공통"])
        make_note(others, title="남것2", tags=["공통"])

        assert client.get("/notes/tags", headers=mine).json()["tags"] == [{"name": "공통", "count": 1}]

    def test_남만_쓴_태그는_아예_안_보인다(self, client, make_user, make_note):
        _, mine = make_user()
        _, others = make_user()
        make_note(mine, title="내것", tags=["내태그"])
        make_note(others, title="남것", tags=["남태그"])

        names = [tag["name"] for tag in client.get("/notes/tags", headers=mine).json()["tags"]]

        assert names == ["내태그"]

    def test_태그를_지우면_목록에서도_빠진다(self, client, make_user, make_note):
        _, headers = make_user()
        note = make_note(headers, tags=["잠깐"])
        client.delete(f"/notes/{note['id']}/tags", headers=headers)

        assert client.get("/notes/tags", headers=headers).json()["tags"] == []

    def test_라우트가_상세조회와_충돌하지_않는다(self, client, make_user, make_note):
        """
        /notes/tags 와 /notes/{id} 는 세그먼트 수가 같다.
        선언 순서가 뒤바뀌면 id="tags" 로 잡혀 404가 난다.
        """
        _, headers = make_user()
        make_note(headers, tags=["확인"])

        res = client.get("/notes/tags", headers=headers)

        assert res.status_code == 200
        assert "tags" in res.json()          # 태그 목록 응답
        assert "title" not in res.json()     # 노트 상세 응답이 아니다

    def test_토큰이_없으면_401(self, client):
        assert client.get("/notes/tags").status_code == 401
