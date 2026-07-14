@echo off
echo ==============================================
echo LIMPANDO O MT5 E RESTAURANDO O SEU PAINEL ORIGINAL
echo ==============================================
echo Instalando dependencias necessarias...
call npm install ssh2
echo Iniciando upload...
node upload_final.cjs
echo.
pause
