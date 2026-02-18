@echo off
cd backend_fastapi
echo Creating virtual environment...
if not exist venv python -m venv venv
echo Activating virtual environment...
call venv\Scripts\activate
echo Installing dependencies...
pip install "cryptography>=42.0.0" --only-binary=:all:
pip install -r requirements.txt
echo Dependencies installed.
echo Setting up environment variables...
if not exist ..\.env copy .env.example ..\.env
cd ..
echo Starting server...
echo Server running at http://127.0.0.1:8000/docs
backend_fastapi\venv\Scripts\uvicorn backend_fastapi.main:app --reload
pause
