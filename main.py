from fastapi import FastAPI
from containers import Container
from user.interface.controllers.user_controller import router as user_routers
from note.interface.controllers.note_controller import router as note_routers
from fastapi.exceptions import RequestValidationError
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS


app = FastAPI()
app.container = Container() #애플리케이션 구동할 때 앞에서 작성한 컨테이너 클래스 등록한다.
app.include_router(user_routers)
app.include_router(note_routers)

#브라우저는 다른 출처(포트가 다르면 다른 출처다)로 가는 요청을 기본적으로 막는다.
#프론트엔드가 뜨는 주소를 허용 목록에 넣어야 한다. 허용 목록은 .env 에서 읽는다
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    return JSONResponse(
        status_code=400,
        content=exc.errors()
    )

@app.get("/")
def hello():
    return {"Hello": "FastAPI"}
