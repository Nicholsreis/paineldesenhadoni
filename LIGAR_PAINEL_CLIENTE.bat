@echo off
title Painel de senha do Ni - Telao (Painel)
echo ===================================================
echo   INICIANDO PAINEL / TELAO (MODO QUIOSQUE)
echo ===================================================

:: ===================================================
:: CONFIGURACAO: IP do computador onde roda o Totem/Servidor
:: Substitua pelo IP correto da sua rede local.
:: Exemplo: set SERVER_IP=192.168.3.24
:: ===================================================
set SERVER_IP=localhost

echo   Servidor: http://%SERVER_IP%:3080
echo ===================================================

:: Tenta usar o executável compilado primeiro, senão usa npx electron
if exist "dist\win-unpacked\Painel de senha do Ni.exe" (
    "dist\win-unpacked\Painel de senha do Ni.exe" --mode=painel --server-ip=%SERVER_IP%
) else (
    npx electron . --mode=painel --server-ip=%SERVER_IP%
)

echo.
echo Sistema encerrado.
pause
