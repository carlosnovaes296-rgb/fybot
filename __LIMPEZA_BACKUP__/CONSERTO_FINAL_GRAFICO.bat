@echo off
echo Restaurando o App.tsx perfeito (App_VPS.tsx)...
node restore_local.cjs
echo.
echo Tudo pronto! O grafico e os menus foram restaurados perfeitamente no seu computador!
echo.
echo AGORA, vamos enviar o site atualizado para a VPS...
node sftp-deploy-all.js
echo.
echo Tudo concluido com sucesso! 
echo Por favor, acesse seu site e aperte Ctrl + F5.
pause
