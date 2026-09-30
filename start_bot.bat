@echo off
:: Garante que o terminal usa a codificação correta para mostrar os emojis do bot
chcp 65001 > nul
title 🤖 CONSCIOUS BOT - ACTIVE AFK TRAINER

:start
cls
echo =====================================================================
echo    🧠 CONSCIOUS BOT: SISTEMA DE INICIALIZAÇÃO E AUTO-RESTART
echo =====================================================================
echo [INFO] Diretório atual detetado: %~dp0
echo [INFO] Iniciando o agente autónomo na infraestrutura local...
echo ---------------------------------------------------------------------

:: Executa o ficheiro principal do bot
node index.js

:: Interceção de erro ou finalização do processo
echo ---------------------------------------------------------------------
echo ⚠️ [ALERTA] O processo do bot foi interrompido ou perdeu a ligação!
echo [INFO] A reiniciar a matriz do agente em 5 segundos...
echo [INFO] Pressione CTRL+C no terminal para abortar o loop.
echo =====================================================================
timeout /t 5 > nul
goto start
