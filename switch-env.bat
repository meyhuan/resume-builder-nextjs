@echo off
setlocal enabledelayedexpansion

set "ENV_DIR=%~dp0"
set "CHINA_ENV=%ENV_DIR%.env.china"
set "OVERSEE_ENV=%ENV_DIR%.env.oversee"
set "TARGET_ENV=%ENV_DIR%.env"

if "%1"=="" (
    echo Usage: switch-env [china^|oversee]
    echo.
    echo Available options:
    echo   china    - Switch to China environment
    echo   oversee  - Switch to Overseas environment
    exit /b 1
)

if /i "%1"=="china" (
    if not exist "%CHINA_ENV%" (
        echo Error: .env.china not found!
        echo Creating .env.china from current .env...
        if exist "%TARGET_ENV%" (
            copy "%TARGET_ENV%" "%CHINA_ENV%" >nul
            echo Created .env.china
        ) else (
            echo Error: No .env file exists to copy from
            exit /b 1
        )
    )
    copy "%CHINA_ENV%" "%TARGET_ENV%" >nul
    echo Switched to CHINA environment
    exit /b 0
)

if /i "%1"=="oversee" (
    if not exist "%OVERSEE_ENV%" (
        echo Error: .env.oversee not found!
        echo Creating .env.oversee from current .env...
        if exist "%TARGET_ENV%" (
            copy "%TARGET_ENV%" "%OVERSEE_ENV%" >nul
            echo Created .env.oversee
        ) else (
            echo Error: No .env file exists to copy from
            exit /b 1
        )
    )
    copy "%OVERSEE_ENV%" "%TARGET_ENV%" >nul
    echo Switched to OVERSEE environment
    exit /b 0
)

echo Unknown environment: %1
echo Use 'china' or 'oversee'
exit /b 1
