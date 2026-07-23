@echo off
node check-pm2-errors.cjs > pm2_errors.txt
notepad pm2_errors.txt
