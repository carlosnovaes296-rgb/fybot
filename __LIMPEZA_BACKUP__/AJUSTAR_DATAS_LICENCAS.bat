@echo off
echo ========================================================
echo INICIANDO REAJUSTE DE DATAS DAS LICENCAS ATIVAS
echo Este script vai recalcular o vencimento exato de cada
echo licenca baseado no plano (30, 60, 90, 180, Vitalicio)
echo e atualizar as datas a partir de HOJE.
echo ========================================================
pause
node reajustar_datas_vps.cjs
echo.
pause
