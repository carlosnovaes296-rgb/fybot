@echo off
echo Buscando erros do servidor na VPS...
node check-pm2-errors.cjs > ERRO_DO_SERVIDOR.txt
notepad ERRO_DO_SERVIDOR.txt
