@echo off
echo ==============================================
echo ENVIANDO ATUALIZACOES PARA O SITE ONLINE...
echo ==============================================
echo.
node sftp-deploy-all.js
echo.
echo Tudo concluido com sucesso! 
echo O seu site online foi atualizado com as suas correcoes.
echo Por favor, va no navegador e aperte Ctrl + F5 para ver o novo grafico.
pause
