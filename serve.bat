@echo off
cd /d "%~dp0"
echo Mo http://localhost:8000
python -m http.server 8000
