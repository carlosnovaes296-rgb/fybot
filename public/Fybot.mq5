//+------------------------------------------------------------------+
//|                                                      Fybot.mq5 |
//|                                   Copyright 2026, Fybot System |
//|                                           http://fybot.life/ |
//+------------------------------------------------------------------+
#property copyright "Fybot System"
#property link      "http://fybot.life/"
#property version   "1.00"

#include <Trade\Trade.mqh>

input string   InpLicenseKey = "";         // Licença do Painel Web
input string   InpServerUrl  = "http://127.0.0.1:3000/api/ea/heartbeat"; // URL da API (Ajustar para http://fybot.life/api/ea/heartbeat)
input int      InpHeartbeatMs = 2000;      // Frequência (ms)
input string   InpSymbols    = "EURUSD,GBPUSD,XAUUSD"; // Símbolos

CTrade trade;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(InpLicenseKey == "")
     {
      Print("ERRO: Licença não preenchida. O robô não vai se conectar.");
      return(INIT_FAILED);
     }
     
   EventSetMillisecondTimer(InpHeartbeatMs);
   Print("Fybot Iniciado. Sincronizando com ", InpServerUrl);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Fybot Parado.");
  }

//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SendHeartbeat();
  }

//+------------------------------------------------------------------+
//| Send Heartbeat and Receive Commands                              |
//+------------------------------------------------------------------+
void SendHeartbeat()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double profit = AccountInfoDouble(ACCOUNT_PROFIT);
   
   string json = "{";
   json += "\"license\":\"" + InpLicenseKey + "\",";
   json += "\"account\":{\"balance\":" + DoubleToString(balance, 2) + ",\"equity\":" + DoubleToString(equity, 2) + ",\"today_realized_profit\":" + DoubleToString(profit, 2) + "},";
   
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
   positionsJson += "],";
   json += positionsJson + ",";
   
   json += "\"data\":{";
   string symbols[];
   int numSymbols = StringSplit(InpSymbols, ',', symbols);
   bool firstSym = true;
   for(int i = 0; i < numSymbols; i++)
     {
      string sym = symbols[i];
      double price = SymbolInfoDouble(sym, SYMBOL_BID);
      if(price > 0)
        {
         if(!firstSym) json += ",";
         
         // Sinais de cruzamento de médias simples para Momentum
         string smcDir = "NEUTRAL";
         string momDir = "NEUTRAL";
         int smcScore = 50;
         int momScore = 50;
         
         double maFast[], maSlow[];
         int handleFast = iMA(sym, PERIOD_M1, 9, 0, MODE_EMA, PRICE_CLOSE);
         int handleSlow = iMA(sym, PERIOD_M1, 21, 0, MODE_EMA, PRICE_CLOSE);
         CopyBuffer(handleFast, 0, 0, 1, maFast);
         CopyBuffer(handleSlow, 0, 0, 1, maSlow);
         if(maFast[0] > maSlow[0]) { smcDir = "BUY"; momDir = "BUY"; smcScore = 80; momScore = 80; }
         else if(maFast[0] < maSlow[0]) { smcDir = "SELL"; momDir = "SELL"; smcScore = 80; momScore = 80; }
         
         json += "\"" + sym + "\":{\"price\":" + DoubleToString(price, 5) + ",\"smcDir\":\"" + smcDir + "\",\"momDir\":\"" + momDir + "\",\"smcScore\":" + IntegerToString(smcScore) + ",\"momScore\":" + IntegerToString(momScore) + "}";
         firstSym = false;
        }
     }
   json += "}"; // end data
   json += "}"; // end root

   char post[], result[];
   string headers;
   StringToCharArray(json, post, 0, StringLen(json));
   
   int res = WebRequest("POST", InpServerUrl, "Content-Type: application/json\r\n", 5000, post, result, headers);
   
   if(res == 200)
     {
      string response = CharArrayToString(result);
      ProcessCommands(response);
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
