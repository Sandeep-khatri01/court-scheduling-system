from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend_fastapi import models
from backend_fastapi.database import engine
from backend_fastapi.routers import auth, cases, schedule, laws, chat
from backend_fastapi.config import settings

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Court Scheduling & AI Chatbot API")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/auth")
app.include_router(cases.router, prefix="/cases")
app.include_router(schedule.router, prefix="/schedule")
app.include_router(laws.router, prefix="/laws")
app.include_router(chat.router, prefix="/chat")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Court Scheduling System API"}
