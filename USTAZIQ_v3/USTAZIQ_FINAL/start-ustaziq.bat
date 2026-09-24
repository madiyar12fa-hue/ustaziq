@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20+ табылмады.
  echo https://nodejs.org/ сайтынан Node.js LTS орнатып, осы файлды қайта ашыңыз.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Тәуелділіктер орнатылуда...
  call npm install
  if errorlevel 1 (
    echo npm install сәтсіз аяқталды.
    pause
    exit /b 1
  )
)
if not exist .env (
  copy /Y .env.example .env >nul
  echo .env жасалды. Оны ашып, OPENAI_API_KEY енгізіңіз.
  notepad .env
)
echo USTAZIQ іске қосылуда...
start "" http://localhost:3000
npm start
