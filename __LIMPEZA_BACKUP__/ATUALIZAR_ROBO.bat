@echo off
echo ===================================================
echo ATUALIZANDO O SERVIDOR FYBOT COM A CORRECAO DO SALDO
echo ===================================================
echo.
echo Compilando painel...
call npm run build
echo.
echo Enviando painel para o VPS...
call node upload-frontend.cjs
echo.
echo Enviando servidor para o VPS...
call node upload-backend-full.cjs
echo.
echo ===================================================
echo ATUALIZACAO CONCLUIDA COM SUCESSO!
echo ===================================================
echo Por favor, abra o site do Fybot, aperte F5 no teclado
echo e inicie o robo na CONTA DEMO. O saldo de 10.000 vai aparecer!
pause
