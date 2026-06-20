//+------------------------------------------------------------------+
//|                                                      Fybot.mq5 |
//|                                   Copyright 2026, Fybot System |
//|                                           http://fybot.life/ |
//+------------------------------------------------------------------+
#property copyright "Fybot System"
#property link      "http://fybot.life/"
#property version   "2.00"

#include <Trade\Trade.mqh>

// ===================================================================
// INPUTS - Conexão (Modo Live)
// ===================================================================
input group "=== Conexão API ==="
input string   InpLicenseKey    = "";         // Licença do Painel Web
input string   InpServerUrl     = "http://209.97.163.75:3000/api/ea/heartbeat"; // URL da API
input int      InpHeartbeatMs   = 2000;       // Frequência heartbeat (ms)
input string   InpSymbols       = "EURUSD,GBPUSD,XAUUSD"; // Símbolos (modo live)

// ===================================================================
// INPUTS - Estratégia
// ===================================================================
input group "=== Timeframes ==="
input ENUM_TIMEFRAMES InpSignalTF    = PERIOD_M15;  // Timeframe do Sinal
input ENUM_TIMEFRAMES InpTrendTF     = PERIOD_H1;   // Timeframe do Filtro de Tendência

input group "=== Médias Móveis ==="
input int      InpEmaFast       = 9;          // EMA Rápida (sinal)
input int      InpEmaSlow       = 21;         // EMA Lenta (sinal)
input int      InpEmaTrend      = 200;        // EMA Tendência (filtro)

input group "=== RSI ==="
input int      InpRsiPeriod     = 14;         // Período RSI
input int      InpRsiOverbought = 70;         // RSI Sobrecomprado (não compra acima)
input int      InpRsiOversold   = 30;         // RSI Sobrevendido (não vende abaixo)

input group "=== ADX (filtro de tendência) ==="
input int      InpAdxPeriod     = 14;         // Período ADX
input int      InpAdxMinLevel   = 25;         // ADX mínimo para operar (tendência)

input group "=== Filtro de Direção ==="
input int      InpDirectionFilter = 0;        // 0=Ambos | 1=Só BUY | -1=Só SELL

input group "=== ATR & Risk ==="
input int      InpAtrPeriod     = 14;         // Período ATR
input double   InpAtrSlMult     = 2.0;        // SL = N x ATR
input double   InpTP_RR         = 2.0;        // TP = RR x SL
input double   InpLotSize       = 0.01;       // Tamanho do lote

input group "=== Cooldown ==="
input int      InpCooldownBars  = 5;          // Esperar N barras após trade fechar

input group "=== Gestão de Posição ==="
input bool     InpUseBreakeven  = true;       // Usar Break-Even?
input double   InpBE_AtrMult    = 1.5;        // Ativar BE quando lucro >= N x ATR
input bool     InpUseTrailing   = false;      // Usar Trailing Stop?
input double   InpTrail_AtrMult = 2.0;        // Trailing distance = N x ATR

input group "=== Filtro de Horário (hora do servidor) ==="
input bool     InpUseTimeFilter = true;       // Usar filtro de horário?
input int      InpStartHour     = 8;          // Hora início (servidor)
input int      InpEndHour       = 17;         // Hora fim (servidor)

// ===================================================================
// VARIÁVEIS GLOBAIS
// ===================================================================
CTrade trade;
bool   g_isTester = false;

// Handles de indicadores — Backtest (símbolo do gráfico)
int    g_hEmaFast   = INVALID_HANDLE;
int    g_hEmaSlow   = INVALID_HANDLE;
int    g_hEmaTrend  = INVALID_HANDLE;
int    g_hRsi       = INVALID_HANDLE;
int    g_hAdx       = INVALID_HANDLE;
int    g_hAtr       = INVALID_HANDLE;

// Handles de indicadores — Modo Live (múltiplos símbolos)
int    g_handleFast[];
int    g_handleSlow[];
string g_symbols[];
int    g_numSymbols = 0;

// Controle de cooldown e barras
datetime g_lastTradeClose = 0;
datetime g_lastBarTime    = 0;
int      g_lastPosCount   = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_isTester = (bool)MQLInfoInteger(MQL_TESTER);

   // Em modo live, exige licença
   if(!g_isTester && InpLicenseKey == "")
     {
      Print("ERRO: Licença não preenchida. O robô não vai se conectar.");
      return(INIT_FAILED);
     }

   if(g_isTester)
     {
      string sym = Symbol();

      // Indicadores no timeframe de SINAL (M15 por padrão)
      g_hEmaFast  = iMA(sym, InpSignalTF, InpEmaFast, 0, MODE_EMA, PRICE_CLOSE);
      g_hEmaSlow  = iMA(sym, InpSignalTF, InpEmaSlow, 0, MODE_EMA, PRICE_CLOSE);
      g_hRsi      = iRSI(sym, InpSignalTF, InpRsiPeriod, PRICE_CLOSE);
      g_hAdx      = iADX(sym, InpSignalTF, InpAdxPeriod);
      g_hAtr      = iATR(sym, InpSignalTF, InpAtrPeriod);

      // Indicador de TENDÊNCIA no timeframe maior (H1 por padrão)
      g_hEmaTrend = iMA(sym, InpTrendTF, InpEmaTrend, 0, MODE_EMA, PRICE_CLOSE);

      // Valida todos os handles
      if(g_hEmaFast == INVALID_HANDLE || g_hEmaSlow == INVALID_HANDLE ||
         g_hEmaTrend == INVALID_HANDLE || g_hRsi == INVALID_HANDLE ||
         g_hAdx == INVALID_HANDLE || g_hAtr == INVALID_HANDLE)
        {
         Print("ERRO FATAL: Falha ao criar indicadores! Verifique se o símbolo ",
               sym, " tem dados nos timeframes ", EnumToString(InpSignalTF),
               " e ", EnumToString(InpTrendTF));
         return(INIT_FAILED);
        }

      Print("╔══════════════════════════════════════╗");
      Print("║       FYBOT V2.0 — BACKTEST         ║");
      Print("╚══════════════════════════════════════╝");
      Print("Símbolo: ", sym);
      Print("Sinal: EMA ", InpEmaFast, "/", InpEmaSlow, " no ", EnumToString(InpSignalTF));
      Print("Tendência: EMA ", InpEmaTrend, " no ", EnumToString(InpTrendTF));
      Print("RSI: ", InpRsiPeriod, " (", InpRsiOversold, "-", InpRsiOverbought, ")");
      Print("ADX: período ", InpAdxPeriod, " | mínimo ", InpAdxMinLevel);
      Print("SL: ", DoubleToString(InpAtrSlMult, 1), " x ATR(", InpAtrPeriod, ") | TP: ", DoubleToString(InpTP_RR, 1), " x SL");
      Print("Cooldown: ", InpCooldownBars, " barras | BE: ", InpUseBreakeven ? "ON" : "OFF",
            " | Trail: ", InpUseTrailing ? "ON" : "OFF");
      Print("Horário: ", InpUseTimeFilter ? StringFormat("%02d:00-%02d:00", InpStartHour, InpEndHour) : "Desativado");
     }
   else
     {
      // MODO LIVE: cria handles simplificados para dados do heartbeat
      g_numSymbols = StringSplit(InpSymbols, ',', g_symbols);
      ArrayResize(g_handleFast, g_numSymbols);
      ArrayResize(g_handleSlow, g_numSymbols);
      for(int i = 0; i < g_numSymbols; i++)
        {
         g_handleFast[i] = iMA(g_symbols[i], PERIOD_M1, 9, 0, MODE_EMA, PRICE_CLOSE);
         g_handleSlow[i] = iMA(g_symbols[i], PERIOD_M1, 21, 0, MODE_EMA, PRICE_CLOSE);
        }
      EventSetMillisecondTimer(InpHeartbeatMs);
      Print("Fybot V2.0 Live. Sincronizando com ", InpServerUrl);
     }

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();

   // Libera handles do backtest
   if(g_hEmaFast  != INVALID_HANDLE) IndicatorRelease(g_hEmaFast);
   if(g_hEmaSlow  != INVALID_HANDLE) IndicatorRelease(g_hEmaSlow);
   if(g_hEmaTrend != INVALID_HANDLE) IndicatorRelease(g_hEmaTrend);
   if(g_hRsi      != INVALID_HANDLE) IndicatorRelease(g_hRsi);
   if(g_hAdx      != INVALID_HANDLE) IndicatorRelease(g_hAdx);
   if(g_hAtr      != INVALID_HANDLE) IndicatorRelease(g_hAtr);

   // Libera handles do modo live
   for(int i = 0; i < g_numSymbols; i++)
     {
      if(g_handleFast[i] != INVALID_HANDLE) IndicatorRelease(g_handleFast[i]);
      if(g_handleSlow[i] != INVALID_HANDLE) IndicatorRelease(g_handleSlow[i]);
     }

   Print("Fybot V2.0 Parado. Razão: ", reason);
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(g_isTester)
     {
      TrackCooldown();         // Detecta fechamento de posição → cooldown
      ManageOpenPositions();   // Break-even + Trailing Stop
      RunBacktestLogic();      // Lógica de entrada
     }
  }

//+------------------------------------------------------------------+
//| Expert timer function — modo live apenas                        |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(!g_isTester)
      SendHeartbeat();
  }

// ===================================================================
//                        BACKTEST ENGINE
// ===================================================================

//+------------------------------------------------------------------+
//| Detecta nova barra no timeframe de sinal                        |
//+------------------------------------------------------------------+
bool IsNewBar()
  {
   datetime currentBarTime = iTime(Symbol(), InpSignalTF, 0);
   if(currentBarTime == 0)
      return false;
   if(currentBarTime != g_lastBarTime)
     {
      g_lastBarTime = currentBarTime;
      return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Filtro de horário de trading                                    |
//+------------------------------------------------------------------+
bool IsWithinTradingHours()
  {
   if(!InpUseTimeFilter)
      return true;

   MqlDateTime dt;
   TimeCurrent(dt);
   int hour = dt.hour;

   if(InpStartHour < InpEndHour)
      return (hour >= InpStartHour && hour < InpEndHour);
   else // Cruza meia-noite
      return (hour >= InpStartHour || hour < InpEndHour);
  }

//+------------------------------------------------------------------+
//| Verifica se o cooldown já passou                                |
//+------------------------------------------------------------------+
bool IsCooldownOver()
  {
   if(g_lastTradeClose == 0)
      return true;

   // Conta barras desde o fechamento do último trade
   int barsSinceClose = Bars(Symbol(), InpSignalTF, g_lastTradeClose, TimeCurrent());
   return (barsSinceClose >= InpCooldownBars);
  }

//+------------------------------------------------------------------+
//| Rastreia fechamento de posição para controle de cooldown         |
//+------------------------------------------------------------------+
void TrackCooldown()
  {
   int currentPosCount = PositionsTotal();
   if(g_lastPosCount > 0 && currentPosCount == 0)
     {
      g_lastTradeClose = TimeCurrent();
     }
   g_lastPosCount = currentPosCount;
  }

//+------------------------------------------------------------------+
//| LÓGICA PRINCIPAL DE BACKTEST                                    |
//| Filtros: Tendência + Cruzamento EMA + RSI + Horário + Cooldown  |
//| SL/TP: Baseado em ATR dinâmico                                  |
//+------------------------------------------------------------------+
void RunBacktestLogic()
  {
   // 1. Só processa na abertura de nova barra do timeframe de sinal
   if(!IsNewBar())
      return;

   // 2. Não abre se já tiver posição
   if(PositionsTotal() > 0)
      return;

   // 3. Verifica cooldown
   if(!IsCooldownOver())
      return;

   // 4. Verifica horário de trading
   if(!IsWithinTradingHours())
      return;

   string sym    = Symbol();
   double ask    = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid    = SymbolInfoDouble(sym, SYMBOL_BID);
   double point  = SymbolInfoDouble(sym, SYMBOL_POINT);
   int    digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

   if(ask <= 0 || bid <= 0 || point <= 0)
      return;

   // === LER INDICADORES ===
   // Precisamos de 2 valores das EMAs (barra anterior + barra atual fechada)
   // para detectar CRUZAMENTO (não apenas posição relativa)
   double emaFast[2], emaSlow[2], emaTrend[1], rsiVal[1], adxVal[1], atrVal[1];

   // Barras 1 e 2 (barra 0 é a atual, ainda aberta — ignoramos)
   if(CopyBuffer(g_hEmaFast,  0, 1, 2, emaFast)  != 2) return;
   if(CopyBuffer(g_hEmaSlow,  0, 1, 2, emaSlow)  != 2) return;
   if(CopyBuffer(g_hEmaTrend, 0, 1, 1, emaTrend)  != 1) return;
   if(CopyBuffer(g_hRsi,      0, 1, 1, rsiVal)    != 1) return;
   if(CopyBuffer(g_hAdx,      0, 1, 1, adxVal)    != 1) return; // ADX main line (buffer 0)
   if(CopyBuffer(g_hAtr,      0, 1, 1, atrVal)    != 1) return;

   // ATR inválido
   if(atrVal[0] <= 0)
      return;

   // === FILTRO 1: TENDÊNCIA (EMA 200 no H1) ===
   bool bullishTrend = (bid > emaTrend[0]);
   bool bearishTrend = (bid < emaTrend[0]);

   // === FILTRO 2: RSI (não sobrecomprado/sobrevendido) ===
   bool rsiOkBuy  = (rsiVal[0] > InpRsiOversold  && rsiVal[0] < InpRsiOverbought);
   bool rsiOkSell = (rsiVal[0] > InpRsiOversold  && rsiVal[0] < InpRsiOverbought);

   // === FILTRO 3: ADX (mercado em tendência) ===
   bool adxTrending = (adxVal[0] >= InpAdxMinLevel);
   if(!adxTrending)
      return;

   // === SINAL: CRUZAMENTO DE EMAs ===
   // emaFast[0] = barra mais antiga (penúltima fechada)
   // emaFast[1] = barra mais recente (última fechada)
   bool crossUp   = (emaFast[0] <= emaSlow[0] && emaFast[1] > emaSlow[1]);
   bool crossDown = (emaFast[0] >= emaSlow[0] && emaFast[1] < emaSlow[1]);

   // === DECISÃO ===
   int direction = 0;

   // BUY: Tendência de alta + Cruzamento para cima + RSI ok
   if(crossUp && bullishTrend && rsiOkBuy)
      direction = 1;

   // SELL: Tendência de baixa + Cruzamento para baixo + RSI ok
   if(crossDown && bearishTrend && rsiOkSell)
      direction = -1;

   // === FILTRO 4: DIREÇÃO (só compra, só venda, ou ambos) ===
   if(InpDirectionFilter == 1 && direction != 1)   return; // só BUY
   if(InpDirectionFilter == -1 && direction != -1) return; // só SELL

   if(direction == 0)
      return;

   // === CÁLCULO DE SL/TP COM ATR DINÂMICO ===
   double slDist = NormalizeDouble(atrVal[0] * InpAtrSlMult, digits);
   double tpDist = NormalizeDouble(slDist * InpTP_RR, digits);

   // Respeita distância mínima de stops do broker
   long minStopsLevel = SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = minStopsLevel * point;
   if(slDist < minDist) slDist = minDist;
   if(tpDist < minDist) tpDist = minDist;

   // === ABERTURA DE POSIÇÃO ===
   if(direction == 1) // BUY
     {
      double slPrice = NormalizeDouble(ask - slDist, digits);
      double tpPrice = NormalizeDouble(ask + tpDist, digits);
      if(trade.Buy(InpLotSize, sym, ask, slPrice, tpPrice, "Fybot BUY"))
         PrintFormat("► BUY %s @ %.5f | SL: %.5f | TP: %.5f | ATR: %.5f | RSI: %.1f",
                     sym, ask, slPrice, tpPrice, atrVal[0], rsiVal[0]);
      else
         PrintFormat("✖ ERRO BUY: %d - %s", trade.ResultRetcode(), trade.ResultRetcodeDescription());
     }
   else // SELL
     {
      double slPrice = NormalizeDouble(bid + slDist, digits);
      double tpPrice = NormalizeDouble(bid - tpDist, digits);
      if(trade.Sell(InpLotSize, sym, bid, slPrice, tpPrice, "Fybot SELL"))
         PrintFormat("► SELL %s @ %.5f | SL: %.5f | TP: %.5f | ATR: %.5f | RSI: %.1f",
                     sym, bid, slPrice, tpPrice, atrVal[0], rsiVal[0]);
      else
         PrintFormat("✖ ERRO SELL: %d - %s", trade.ResultRetcode(), trade.ResultRetcodeDescription());
     }
  }

// ===================================================================
//                    GESTÃO DE POSIÇÕES ABERTAS
// ===================================================================

//+------------------------------------------------------------------+
//| Gerencia Break-Even e Trailing Stop nas posições abertas        |
//+------------------------------------------------------------------+
void ManageOpenPositions()
  {
   if(!InpUseBreakeven && !InpUseTrailing)
      return;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      // Só gerencia posições do símbolo atual
      string sym = PositionGetString(POSITION_SYMBOL);
      if(sym != Symbol()) continue;

      // Só gerencia posições abertas por este EA
      string comment = PositionGetString(POSITION_COMMENT);
      if(StringFind(comment, "Fybot") == -1) continue;

      long   posType   = PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSl = PositionGetDouble(POSITION_SL);
      double currentTp = PositionGetDouble(POSITION_TP);
      double point     = SymbolInfoDouble(sym, SYMBOL_POINT);
      int    digits    = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

      // Lê ATR atual para distâncias dinâmicas
      double atr[];
      if(CopyBuffer(g_hAtr, 0, 0, 1, atr) != 1) continue;

      double beThreshold = atr[0] * InpBE_AtrMult;
      double trailDist   = atr[0] * InpTrail_AtrMult;

      if(posType == POSITION_TYPE_BUY)
        {
         double bid = SymbolInfoDouble(sym, SYMBOL_BID);
         double profitDist = bid - openPrice;

         // Break-Even: move SL para o preço de entrada + 1 point
         if(InpUseBreakeven && profitDist >= beThreshold && currentSl < openPrice)
           {
            double newSl = NormalizeDouble(openPrice + point, digits);
            if(trade.PositionModify(ticket, newSl, currentTp))
               PrintFormat("⇆ BE ativado ticket #%I64u | SL → %.5f", ticket, newSl);
           }
         // Trailing Stop: move SL junto com o preço
         else if(InpUseTrailing && profitDist > trailDist)
           {
            double newSl = NormalizeDouble(bid - trailDist, digits);
            if(newSl > currentSl && newSl > openPrice)
              {
               if(trade.PositionModify(ticket, newSl, currentTp))
                  PrintFormat("⇈ Trail BUY #%I64u | SL → %.5f", ticket, newSl);
              }
           }
        }
      else if(posType == POSITION_TYPE_SELL)
        {
         double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
         double profitDist = openPrice - ask;

         // Break-Even
         if(InpUseBreakeven && profitDist >= beThreshold && (currentSl > openPrice || currentSl == 0))
           {
            double newSl = NormalizeDouble(openPrice - point, digits);
            if(trade.PositionModify(ticket, newSl, currentTp))
               PrintFormat("⇆ BE ativado ticket #%I64u | SL → %.5f", ticket, newSl);
           }
         // Trailing Stop
         else if(InpUseTrailing && profitDist > trailDist)
           {
            double newSl = NormalizeDouble(ask + trailDist, digits);
            if((newSl < currentSl || currentSl == 0) && newSl < openPrice)
              {
               if(trade.PositionModify(ticket, newSl, currentTp))
                  PrintFormat("⇊ Trail SELL #%I64u | SL → %.5f", ticket, newSl);
              }
           }
        }
     }
  }

// ===================================================================
//                    MODO LIVE — API HEARTBEAT
// ===================================================================

//+------------------------------------------------------------------+
//| Envia dados para o servidor e recebe comandos                   |
//+------------------------------------------------------------------+
void SendHeartbeat()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double profit  = AccountInfoDouble(ACCOUNT_PROFIT);
   string accType = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO) ? "DEMO" : "REAL";

   string json = "{";
   json += "\"license\":\"" + InpLicenseKey + "\",";
   json += "\"account\":{\"balance\":" + DoubleToString(balance, 2)
         + ",\"equity\":" + DoubleToString(equity, 2)
         + ",\"today_realized_profit\":" + DoubleToString(profit, 2)
         + ",\"accountType\":\"" + accType + "\"},";

   // Open tickets
   json += "\"open_tickets\":[";
   string positionsJson = "\"open_positions\":[";

   int total = PositionsTotal();
   bool first = true;
   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
        {
         if(!first) { json += ","; positionsJson += ","; }
         json += IntegerToString(ticket);

         double posProfit = PositionGetDouble(POSITION_PROFIT);
         string sym = PositionGetString(POSITION_SYMBOL);
         positionsJson += "{\"ticket\":" + IntegerToString(ticket)
                       + ",\"symbol\":\"" + sym + "\""
                       + ",\"profit\":" + DoubleToString(posProfit, 2) + "}";
         first = false;
        }
     }
   json += "],";
   positionsJson += "]";
   json += positionsJson + ",";

   // Market data
   json += "\"data\":{";
   bool firstSym = true;
   for(int i = 0; i < g_numSymbols; i++)
     {
      string sym = g_symbols[i];
      double price = SymbolInfoDouble(sym, SYMBOL_BID);
      if(price > 0)
        {
         if(!firstSym) json += ",";

         string smcDir = "NEUTRAL";
         string momDir = "NEUTRAL";
         int smcScore = 50;
         int momScore = 50;

         double maFast[], maSlow[];
         if(g_handleFast[i] != INVALID_HANDLE && g_handleSlow[i] != INVALID_HANDLE)
           {
            CopyBuffer(g_handleFast[i], 0, 0, 1, maFast);
            CopyBuffer(g_handleSlow[i], 0, 0, 1, maSlow);
            if(maFast[0] > maSlow[0])      { smcDir = "BUY";  momDir = "BUY";  smcScore = 80; momScore = 80; }
            else if(maFast[0] < maSlow[0]) { smcDir = "SELL"; momDir = "SELL"; smcScore = 80; momScore = 80; }
           }

         json += "\"" + sym + "\":{\"price\":" + DoubleToString(price, 5)
               + ",\"smcDir\":\"" + smcDir + "\""
               + ",\"momDir\":\"" + momDir + "\""
               + ",\"smcScore\":" + IntegerToString(smcScore)
               + ",\"momScore\":" + IntegerToString(momScore) + "}";
         firstSym = false;
        }
     }
   json += "}"; // end data
   json += "}"; // end root

   // Envia via WebRequest
   char post[], result[];
   string headers;
   int jsonLen = StringLen(json);
   ArrayResize(post, jsonLen);
   StringToCharArray(json, post, 0, jsonLen);

   ResetLastError();
   int res = WebRequest("POST", InpServerUrl, "Content-Type: application/json\r\n", 5000, post, result, headers);

   if(res == 200)
     {
      string response = CharArrayToString(result);
      ProcessCommands(response);
     }
   else
     {
      int lastErr = GetLastError();
      string responseStr = CharArrayToString(result);
      if(lastErr == 4014 || lastErr == 4064)
         Print("PERMISSAO NEGADA (err:", lastErr, "): Va em Ferramentas > Opcoes > Expert Advisors e adicione a URL: ", InpServerUrl);
      else
         Print("Erro ao conectar no Servidor! HTTP: ", res, " | Erro MT5: ", lastErr, " | Resposta: ", responseStr);
     }
  }

//+------------------------------------------------------------------+
//| Processa comandos recebidos do servidor                         |
//+------------------------------------------------------------------+
void ProcessCommands(string jsonResponse)
  {
   if(StringFind(jsonResponse, "\"action\":\"OPEN\"") != -1)
     {
      Print("EA recebeu ordem de abertura!");
      int symStart = StringFind(jsonResponse, "\"symbol\":\"") + 10;
      int symEnd   = StringFind(jsonResponse, "\"", symStart);
      string sym   = StringSubstr(jsonResponse, symStart, symEnd - symStart);

      int typeStart = StringFind(jsonResponse, "\"type\":\"") + 8;
      int typeEnd   = StringFind(jsonResponse, "\"", typeStart);
      string type   = StringSubstr(jsonResponse, typeStart, typeEnd - typeStart);

      int lotStart = StringFind(jsonResponse, "\"lot\":") + 6;
      int lotEnd   = StringFind(jsonResponse, ",", lotStart);
      if(lotEnd == -1) lotEnd = StringFind(jsonResponse, "}", lotStart);
      double lot = StringToDouble(StringSubstr(jsonResponse, lotStart, lotEnd - lotStart));

      if(type == "BUY")       trade.Buy(lot, sym);
      else if(type == "SELL") trade.Sell(lot, sym);
     }

   if(StringFind(jsonResponse, "\"action\":\"CLOSE\"") != -1)
     {
      Print("EA recebeu ordem de fechamento!");
      int tStart = StringFind(jsonResponse, "\"ticket\":\"") + 10;
      int tEnd   = StringFind(jsonResponse, "\"", tStart);
      ulong ticket = StringToInteger(StringSubstr(jsonResponse, tStart, tEnd - tStart));

      trade.PositionClose(ticket);
     }
  }
//+------------------------------------------------------------------+
