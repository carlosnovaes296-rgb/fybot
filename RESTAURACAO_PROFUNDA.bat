@echo off
echo ==============================================
echo RESTAURACAO PROFUNDA DO SISTEMA - 8:00 AM
echo ==============================================
echo.
echo 1. Restaurando banco de dados corrompido...
node restaurar_db.cjs
echo.
echo 2. Desfazendo alteracoes no codigo...
git checkout -- server.ts
echo.
echo 3. Enviando para a VPS...
node upload_forcado.cjs
echo.
echo 4. Reiniciando Servidor...
node restart-vps.cjs
echo.
echo RESTAURACAO COMPLETA!
pause
