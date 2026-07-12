@echo off
echo =======================================
echo Compilando a nova tela do Fybot...
echo =======================================
call npm run build
echo.
echo =======================================
echo Enviando para o Servidor VPS...
echo =======================================
node upload-frontend.cjs
echo.
echo =======================================
echo TUDO PRONTO! Aperte F5 no seu site!
echo =======================================
pause
