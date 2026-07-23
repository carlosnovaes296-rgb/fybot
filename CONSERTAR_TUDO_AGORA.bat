@echo off
echo ==============================================
echo INICIANDO CONSERTO FINAL DA VPS E BANCO DE DADOS
echo ==============================================
echo.

echo 1. Enviando o codigo mais seguro para a VPS...
node upload_forcado.cjs
echo.

echo 2. Corrigindo o banco de dados MySQL remotamente...
node fix-crash.cjs
echo.

echo 3. Reiniciando o servidor Node na VPS...
node restart-vps.cjs
echo.

echo ==============================================
echo TUDO PRONTO! ATUALIZE A PAGINA AGORA!
echo ==============================================
pause
