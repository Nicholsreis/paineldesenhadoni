@echo off
title Painel de senha do Ni - Totem + Servidor
echo ===================================================
echo   INICIANDO SERVIDOR (porta 3080)...
echo ===================================================

:: Inicia o servidor em janela minimizada
start /min "Servidor Painel Ni" node server.js

echo.
echo ===================================================
echo   INICIANDO TOTEM (MODO QUIOSQUE)...
echo ===================================================

:: Aguarda 2 segundos para o servidor subir
timeout /t 2 /nobreak > nul

:: Tenta usar o executável compilado primeiro, senão usa npx electron
if exist "dist\win-unpacked\Painel de senha do Ni.exe" (
    "dist\win-unpacked\Painel de senha do Ni.exe" --mode=totem
) else (
    npx electron . --mode=totem
)

echo.
echo Sistema encerrado.
pause
