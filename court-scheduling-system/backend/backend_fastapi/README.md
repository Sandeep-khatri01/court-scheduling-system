# AI Court Case Scheduling + Legal Chatbot (FastAPI Backend)

This is a production-quality backend for an AI-powered court scheduling system.

## Tech Stack
- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **Caching/Queue:** Redis
- **AI:** OpenAI API (GPT-4)
- **Authentication:** JWT + OAuth2

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- PostgreSQL
- Redis Server

### 2. Installation

1.  Create a virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate # Linux/Mac
    ```

2.  Install dependencies:
    ```bash
    pip install -r backend_fastapi/requirements.txt
    ```

3.  Configure Environment Variables:
    - Copy `.env.example` to `.env` inside `backend_fastapi` (or root depending on where you run it).
    - Update `DATABASE_URL`, `REDIS_URL`, and `OPENAI_API_KEY`.
    
    ```bash
    cp backend_fastapi/.env.example .env
    ```

### 3. Database Setup
Make sure PostgreSQL is running and create a database named `court_db` (or whatever you set in `.env`).

The application will automatically create tables on startup (via `models.Base.metadata.create_all`).

### 4. Run the Server

```bash
uvicorn backend_fastapi.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.
Docs are at `http://127.0.0.1:8000/docs`.

## API Modules

- **/auth**: Login and Register.
- **/cases**: Create, Read, Update cases.
- **/schedule**: Generate hearing schedules based on priority.
- **/laws**: Search legal database.
- **/chat**: AI Legal Assistant context-aware chat.

## Project Structure

```
backend_fastapi/
├── main.py             # App entry point
├── config.py           # Configuration
├── database.py         # DB connection
├── models.py           # SQLAlchemy Models
├── schemas.py          # Pydantic Schemas
├── auth.py             # Authentication Logic
├── redis_utils.py      # Redis Client
├── routers/            # API Endpoints
│   ├── auth.py
│   ├── cases.py
│   ├── schedule.py
│   ├── laws.py
│   └── chat.py
└── services/           # Business Logic
    ├── ai_service.py
    └── scheduling_service.py
```
