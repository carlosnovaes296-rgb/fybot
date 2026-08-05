@echo off
echo Recuperando o codigo correto do historico...
node recover.cjs
echo.
echo Restaurando arquivo App.tsx original...
copy /Y "src\App_recovered.tsx" "src\App.tsx"
echo.
echo Tudo pronto! O grafico foi restaurado no seu computador!
echo.
echo AGORA, vamos enviar o site atualizado para a VPS...
node sftp-deploy-all.js
echo.
echo Tudo concluido com sucesso! 
echo Por favor, acesse seu site e aperte Ctrl + F5.
pause
