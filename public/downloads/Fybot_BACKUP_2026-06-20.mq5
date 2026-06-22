//+------------------------------------------------------------------+
//|                                                      Fybot.mq5 |
//|                                   Copyright 2026, Fybot System |
//|                                           http://fybot.life/ |
//+------------------------------------------------------------------+
#property copyright "Fybot System"
#property link      "http://fybot.life/"
#property version   "1.02"

#include <Trade\Trade.mqh>

input string   InpLicenseKey = "";         // Licença do Painel Web
input string   InpServerUrl  = "https://fybot.life/api/ea/heartbeat"; // URL da API de produção
input int      InpHeartbeatMs = 2000;      // Frequência (ms)
input string   InpSymbols    = "EURUSD,GBPUSD,XAUUSD"; // Símbolos
input int      InpStopLossPoints  = 200;   // Stop Loss em pontos (backtest)
input double   InpTP_RR           = 2.0;   // Take Profit = RR x SL (backtest)

CTrade trade;
bool   g_isTester = false;

// Handles de indicadores para o backtest (símbolo do gráfico)
int    g_btHandleFast = INVALID_HANDLE;
int    g_btHandleSlow = INVALID_HANDLE;

// Handles de indicadores para modo live (múltiplos símbolos)
int    g_handleFast[];
int    g_handleSlow[];
string g_symbols[];
int    g_numSymbols = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_isTester = (bool)MQLInfoInteger(MQL_TESTER);

   // Em modo conta real/demo, exige licença
   if(!g_isTester && InpLicenseKey == "")
     {
      Print("ERRO: Licença não preenchida. O robô não vai se conectar.");
      return(INIT_FAILED);
     }

   if(g_isTester)
     {
      // MODO BACKTEST: cria handles apenas para o símbolo do gráfico
      string sym = Symbol();
      g_btHandleFast = iMA(sym, PERIOD_M1, 9, 0, MODE_EMA, PRICE_CLOSE);
      g_btHandleSlow = iMA(sym, PERIOD_M1, 21, 0, MODE_EMA, PRICE_CLOSE);
      
      if(g_btHandleFast == INVALID_HANDLE || g_btHandleSlow == INVALID_HANDLE)
        {
         Print("AVISO: Não foi possível criar indicadores MA para ", sym,
               " | HandleFast=", g_btHandleFast, " HandleSlow=", g_btHandleSlow);
        }
      
      Print("=== FYBOT BACKTEST INICIADO ===");
      Print("Símbolo: ", sym);
      Print("SL Points: ", InpStopLossPoints, " | TP RR: ", DoubleToString(InpTP_RR, 1));
      Print("Point: ", DoubleToString(SymbolInfoDouble(sym, SYMBOL_POINT), 10));
      Print("Digits: ", SymbolInfoInteger(sym, SYMBOL_DIGITS));
     }
   else
     {
      // MODO LIVE: cria handles para todos os símbolos da lista
      g_numSymbols = StringSplit(InpSymbols, ',', g_symbols);
      ArrayResize(g_handleFast, g_numSymbols);
      ArrayResize(g_handleSlow, g_numSymbols);
      for(int i = 0; i < g_numSymbols; i++)
        {
         g_handleFast[i] = iMA(g_symbols[i], PERIOD_M1, 9, 0, MODE_EMA, PRICE_CLOSE);
         g_handleSlow[i] = iMA(g_symbols[i], PERIOD_M1, 21, 0, MODE_EMA, PRICE_CLOSE);
        }
      EventSetMillisecondTimer(InpHeartbeatMs);
      Print("Fybot Iniciado. Sincronizando com ", InpServerUrl);
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
   if(g_btHandleFast != INVALID_HANDLE) IndicatorRelease(g_btHandleFast);
   if(g_btHandleSlow != INVALID_HANDLE) IndicatorRelease(g_btHandleSlow);
   
   // Libera handles do modo live
   for(int i = 0; i < g_numSymbols; i++)
     {
      if(g_handleFast[i] != INVALID_HANDLE) IndicatorRelease(g_handleFast[i]);
      if(g_handleSlow[i] != INVALID_HANDLE) IndicatorRelease(g_handleSlow[i]);
     }
   Print("Fybot Parado. Razão: ", reason);
  }

//+------------------------------------------------------------------+
//| Expert tick function — ESSENCIAL para o backtest funcionar       |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(g_isTester)
     {
      RunBacktestLogic();
     }
  }

//+------------------------------------------------------------------+
//| Expert timer function — usado apenas em conta real/demo         |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(!g_isTester)
      SendHeartbeat();
  }

//+------------------------------------------------------------------+
//| Lógica de backtest com SL/TP baseados em pontos                 |
//+------------------------------------------------------------------+
void RunBacktestLogic()
  {
   // Só abre trade se não tiver nenhuma posição aberta
   if(PositionsTotal() > 0)
      return;

   string sym = Symbol();
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   int    digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

   if(ask <= 0 || bid <= 0 || point <= 0)
      return;

   // Determina direção do trade via cruzamento de EMAs
   int direction = 0; // 0=neutro, 1=buy, -1=sell
   
   if(g_btHandleFast != INVALID_HANDLE && g_btHandleSlow != INVALID_HANDLE)
     {
      double maFast[], maSlow[];
      if(CopyBuffer(g_btHandleFast, 0, 0, 1, maFast) == 1 &&
         CopyBuffer(g_btHandleSlow, 0, 0, 1, maSlow) == 1)
        {
         if(maFast[0] > maSlow[0]) direction = 1;   // BUY
         else if(maFast[0] < maSlow[0]) direction = -1; // SELL
        }
      else
        {
         // CopyBuffer falhou, compra por padrão
         direction = 1;
        }
     }
   else
     {
      // Handles inválidos, compra por padrão para não travar o backtest
      direction = 1;
     }

   if(direction == 0)
      return;

   // Calcula SL e TP em pontos (configurável)
   double slDist = InpStopLossPoints * point;
   double tpDist = InpStopLossPoints * InpTP_RR * point;

   if(direction == 1) // BUY
     {
      double slPrice = NormalizeDouble(ask - slDist, digits);
      double tpPrice = NormalizeDouble(ask + tpDist, digits);
      if(!trade.Buy(0.01, sym, ask, slPrice, tpPrice, "Fybot BUY"))
         Print("ERRO ao abrir BUY: ", trade.ResultRetcode(), " | ", trade.ResultRetcodeDescription());
     }
   else // SELL
     {
      double slPrice = NormalizeDouble(bid + slDist, digits);
      double tpPrice = NormalizeDouble(bid - tpDist, digits);
      if(!trade.Sell(0.01, sym, bid, slPrice, tpPrice, "Fybot SELL"))
         Print("ERRO ao abrir SELL: ", trade.ResultRetcode(), " | ", trade.ResultRetcodeDescription());
     }
  }

//+------------------------------------------------------------------+
//| Send Heartbeat and Receive Commands (modo LIVE/DEMO apenas)     |
//+------------------------------------------------------------------+
void SendHeartbeat()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double profit = AccountInfoDouble(ACCOUNT_PROFIT);
   string accType = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO) ? "DEMO" : "REAL";
   
   string json = "{";
   json += "\"license\":\"" + InpLicenseKey + "\",";
   json += "\"account\":{\"balance\":" + DoubleToString(balance, 2) + ",\"equity\":" + DoubleToString(equity, 2) + ",\"today_realized_profit\":" + DoubleToString(profit, 2) + ",\"accountType\":\"" + accType + "\"},";
   
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
         positionsJson += "{\"ticket\":" + IntegerToString(ticket) + ",\"symbol\":\"" + sym + "\",\"profit\":" + DoubleToString(posProfit, 2) + "}";
         first = false;
        }
     }
   json += "],";
   positionsJson += "]";
   json += positionsJson + ",";
   
   json += "\"data\":{";
   bool firstSym = true;
   for(int i = 0; i < g_numSymbols; i++)
     {
      string sym = g_symbols[i];
      double price = SymbolInfoDouble(sym, SYMBOL_BID);
      if(price > 0)
        {
         if(!firstSym) json += ",";
         
         // Sinais de cruzamento de médias
         string smcDir = "NEUTRAL";
         string momDir = "NEUTRAL";
         int smcScore = 50;
         int momScore = 50;
         
         double maFast[], maSlow[];
         if(g_handleFast[i] != INVALID_HANDLE && g_handleSlow[i] != INVALID_HANDLE)
           {
            CopyBuffer(g_handleFast[i], 0, 0, 1, maFast);
            CopyBuffer(g_handleSlow[i], 0, 0, 1, maSlow);
            if(maFast[0] > maSlow[0]) { smcDir = "BUY"; momDir = "BUY"; smcScore = 80; momScore = 80; }
            else if(maFast[0] < maSlow[0]) { smcDir = "SELL"; momDir = "SELL"; smcScore = 80; momScore = 80; }
           }
         
         json += "\"" + sym + "\":{\"price\":" + DoubleToString(price, 5) + ",\"smcDir\":\"" + smcDir + "\",\"momDir\":\"" + momDir + "\",\"smcScore\":" + IntegerToString(smcScore) + ",\"momScore\":" + IntegerToString(momScore) + "}";
         firstSym = false;
        }
     }
   json += "}"; // end data
   json += "}"; // end root

   char post[], result[];
   string headers;
   // Converte JSON para array de bytes sem o null terminator (evita erro 4006)
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
//| Process Commands received from server                            |
//+------------------------------------------------------------------+
void ProcessCommands(string jsonResponse)
  {
   // Parse básico sem bibliotecas externas
   if(StringFind(jsonResponse, "\"action\":\"OPEN\"") != -1)
     {
      Print("EA recebeu ordem de abertura!");
      // Extrair Symbol
      int symStart = StringFind(jsonResponse, "\"symbol\":\"") + 10;
      int symEnd = StringFind(jsonResponse, "\"", symStart);
      string sym = StringSubstr(jsonResponse, symStart, symEnd - symStart);
      
      // Extrair Type
      int typeStart = StringFind(jsonResponse, "\"type\":\"") + 8;
      int typeEnd = StringFind(jsonResponse, "\"", typeStart);
      string type = StringSubstr(jsonResponse, typeStart, typeEnd - typeStart);
      
      // Extrair Lot
      int lotStart = StringFind(jsonResponse, "\"lot\":") + 6;
      int lotEnd = StringFind(jsonResponse, ",", lotStart);
      if(lotEnd == -1) lotEnd = StringFind(jsonResponse, "}", lotStart);
      double lot = StringToDouble(StringSubstr(jsonResponse, lotStart, lotEnd - lotStart));
      
      if(type == "BUY") trade.Buy(lot, sym);
      else if(type == "SELL") trade.Sell(lot, sym);
     }
     
   if(StringFind(jsonResponse, "\"action\":\"CLOSE\"") != -1)
     {
      Print("EA recebeu ordem de fechamento!");
      int tStart = StringFind(jsonResponse, "\"ticket\":\"") + 10;
      int tEnd = StringFind(jsonResponse, "\"", tStart);
      ulong ticket = StringToInteger(StringSubstr(jsonResponse, tStart, tEnd - tStart));
      
      trade.PositionClose(ticket);
     }
  }
//+------------------------------------------------------------------+
