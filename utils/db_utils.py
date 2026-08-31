from sqlalchemy import inspect

#sqlalchemy 모듈에서 제공하는 inspect 함수를 이용해 sqlalchemy의 row 속성을 딕셔너리로 변환
def row_to_dict(now) -> dict:
    return {key: getattr(row,key) for key in inspect(row).attr.keys()}