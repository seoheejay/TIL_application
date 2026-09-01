from fastapi import FastAPI
from containers import Container
from user.interface.controllers.user_controller import router as user_routers
from fastapi.exceptions import RequestValidationError
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from note.interface.controllers.note_controller import router as note_routers

app = FastAPI()
app.container = Container() #애플리케이션 구동할 때 앞에서 작성한 컨테이너 클래스 등록한다.
app.include_router(user_routers)
app.include_router(note_routers)

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