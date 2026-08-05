@echo off
echo ==============================================
echo ENVIANDO ATUALIZACAO DO FYBOT PARA A NUVEM...
echo ==============================================
git add .
git commit -m "Deploy automatico - resolvendo queda da Deriv"
git push
echo.
echo ==============================================
echo PRONTO! O CODIGO FOI ENVIADO PARA A INTERNET!
echo.
echo A DigitalOcean ja esta recebendo os arquivos.
echo Agora, basta esperar uns 3 minutinhos, ir
echo no site fybot.life, apertar F5 e iniciar o robo!
echo ==============================================
pause
