@echo off
setlocal
cd /d %~dp0
if not exist .venv (
  py -3.12 -m venv .venv
)
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
echo DTF Smart Prepress: http://127.0.0.1:8000
python -m uvicorn api:app --host 127.0.0.1 --port 8000
