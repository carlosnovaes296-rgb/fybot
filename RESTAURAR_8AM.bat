@echo off
echo ==============================================
echo RESTAURANDO O SISTEMA PARA A VERSAO DE HOJE 8:00 AM
echo ==============================================
echo.
echo 1. Desfazendo todas as modificacoes no codigo...
git checkout -- server.ts
echo.
echo 2. Enviando o codigo original de volta para a VPS...
node upload_forcado.cjs
echo.
echo 3. Reiniciando a VPS...
node restart-vps.cjs
echo.
echo ==============================================
echo SISTEMA TOTALMENTE RESTAURADO PARA AS 8:00 AM!
echo ATUALIZE A SUA PAGINA!
echo ==============================================
pause
