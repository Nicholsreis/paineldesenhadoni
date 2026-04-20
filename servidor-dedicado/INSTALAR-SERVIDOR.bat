@echo off
title Painel de senha do Ni - Instalacao do Servidor
echo ===================================================
echo   PAINEL DE SENHA DO NI - SERVIDOR DEDICADO
echo ===================================================
echo.

:: Verifica se Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js antes de continuar:
    echo https://nodejs.org/en/download
    echo.
    echo Baixe a versao LTS e instale com as opcoes padrao.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
node --version
echo.

:: Instala dependencias
echo Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.
echo.

:: Instala como servico Windows (requer Admin)
echo Instalando servico Windows...
echo (Pode aparecer uma janela de confirmacao do UAC)
echo.
node install-service.js

echo.
echo ===================================================
echo   INSTALACAO CONCLUIDA!
echo ===================================================
echo.
echo O servidor esta rodando na porta 3080.
echo.
echo Para verificar: abra o navegador e acesse
echo   http://localhost:3080
echo.
echo O servico inicia automaticamente com o Windows.
echo.
pause
