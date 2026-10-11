@echo off
setlocal
cd /d "%~dp0"
echo.
echo  SENTINEL ^| AI SECURITY
 echo ======================
echo.
where py >nul 2>nul
if errorlevel 1 (
  echo Python Launcher ^(py^) was not found. Install Python 3.11+ from python.org and enable Add Python to PATH.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20+ from nodejs.org, then run this file again.
  pause
  exit /b 1
)
if not exist "backend\.venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -3 -m venv backend\.venv
  if errorlevel 1 (echo Could not create the Python environment. Ensure Python 3.11+ is installed.& pause & exit /b 1)
)
echo Installing backend requirements...
call "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
call "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 (echo Backend dependencies could not be installed. Check your internet connection.& pause & exit /b 1)
if not exist "backend\ml\models\sentinel_url_model.joblib" (
  echo.
  echo Downloading the public UCI dataset and training the model. This may take several minutes...
  pushd backend
  call .venv\Scripts\python.exe ml\train_model.py
  set TRAIN_EXIT=%errorlevel%
  popd
  if not "%TRAIN_EXIT%"=="0" (echo Model training failed. Read the error above, then try again.& pause & exit /b 1)
)
if not exist "frontend\node_modules" (
  echo Installing frontend packages...
  pushd frontend
  call npm install
  set NPM_EXIT=%errorlevel%
  popd
  if not "%NPM_EXIT%"=="0" (echo Frontend dependencies could not be installed. Check your internet connection.& pause & exit /b 1)
)
echo Starting the Python API in a new window...
start "SENTINEL API" cmd /k "cd /d "%~dp0backend" ^&^& .venv\Scripts\python.exe app.py"
echo Starting the website in a new window...
start "SENTINEL WEB" cmd /k "cd /d "%~dp0frontend" ^&^& npm run dev"
echo.
echo When Vite starts, open the local URL shown in the website terminal (usually http://localhost:5173).
echo Keep both terminal windows open while using SENTINEL.
pause
