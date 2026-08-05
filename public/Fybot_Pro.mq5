//+------------------------------------------------------------------+
//|                                                   Fybot_Pro.mq5 |
//|                                        Institucional DCA Sniper |
//+------------------------------------------------------------------+
#property copyright "Fybot Pro"
#property link      "https://fybot.life"
#property version   "2.00"

#include <Trade\Trade.mqh>

input string   InpLicenseKey = "";           // Token / E-mail da Licença Fybot
input string   InpServerUrl = "https://fybot.life/api/mt5-webhook"; // URL do Servidor
input double   InpLotSize = 0.01;            // Lote Fixo (Stake)
input double   InpMaxSLDollars = 10.0;       // Stop Loss Máximo por Ordem ($)
input double   InpDailyTargetPct = 3.0;      // Meta Diária de Lucro (%)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

CTrade         trade;
double         initialBalance = 0;
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;

// Configurações do DCA
double         DCADrops[5] = {0.0006, 0.0010, 0.0015, 0.0020, 0.0025};
double         DCATPs[5]   = {0.0005, 0.0008, 0.0013, 0.0018, 0.0022};

// Handles de Indicadores
int            handleEma21;
int            handleRsi14;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   UpdateMidnightTime();

   handleEma21 = iMA(_Symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleRsi14 = iRSI(_Symbol, PERIOD_M5, 14, PRICE_CLOSE);

   if(handleEma21 == INVALID_HANDLE || handleRsi14 == INVALID_HANDLE)
     {
      Print("Erro ao carregar indicadores.");
      return(INIT_FAILED);
     }

   EventSetTimer(60); // Chama OnTimer a cada 60 segundos
   Print("Fybot Pro EA Inicializado! Banca Inicial: $", DoubleToString(initialBalance, 2));
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Atualiza horário de meia-noite para controle de lucro diário     |
//+------------------------------------------------------------------+
void UpdateMidnightTime()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour = 0;
   dt.min = 0;
   dt.sec = 0;
   midnightTime = StructToTime(dt);
  }

//+------------------------------------------------------------------+
//| Calcula o Lucro Fechado do Dia                                   |
//+------------------------------------------------------------------+
double GetDailyProfit()
  {
   UpdateMidnightTime();
   HistorySelect(midnightTime, TimeCurrent());
   double totalProfit = 0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagicNumber)
        {
         totalProfit += HistoryDealGetDouble(ticket, DEAL_PROFIT);
         totalProfit += HistoryDealGetDouble(ticket, DEAL_SWAP);
         totalProfit += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
        }
     }
   return totalProfit;
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   double dailyProfit = GetDailyProfit();
   double dailyTarget = initialBalance * (InpDailyTargetPct / 100.0);

   int openOrders = 0;
   double floatingPnL = 0;
   double firstOrderPrice = 0;
   long currentType = -1; // 0 = Buy, 1 = Sell

   // Verifica Violinada (SL em Dólares) e calcula o estado atual
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
         
         // Proteção de Violinada (Corta 1 ordem individualmente)
         if(posPnL <= -InpMaxSLDollars)
           {
            Print("🚨 [VIOLINADA] Ordem perdeu $", DoubleToString(-posPnL, 2), ". Fechando imediatamente!");
            trade.PositionClose(ticket);
            continue;
           }
         
         openOrders++;
         floatingPnL += posPnL;
         
         // Para DCA, achamos o preço da primeira ordem da grade (a mais antiga)
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         if(firstOrderPrice == 0 || PositionGetInteger(POSITION_TIME) < firstOrderPrice) 
           {
            // Usando firstOrderPrice temporariamente para achar o tempo mais antigo, precisamos arrumar isso.
            // Para simplificar, a Ordem 1 pode não ser a de menor tempo se houver problema, mas no DCA linear sim.
           }
        }
     }

   // Lógica de Trava Pós-Meta Diária
   if(dailyProfit >= dailyTarget)
     {
      if(openOrders > 0)
        {
         double maxAllowedLoss = -(dailyProfit * 0.05);
         if(floatingPnL <= maxAllowedLoss)
           {
            Print("🏆 [TRAVA DE PROTEÇÃO] O flutuante atingiu 5% do lucro diário ($", DoubleToString(floatingPnL, 2), "). Fechando tudo!");
            CloseAll();
           }
        }
      return; // Meta batida, não avalia mais entradas novas
     }

   // Varredura para encontrar a Ordem "Âncora" (Primeira ordem)
   if(openOrders > 0)
     {
      datetime oldestTime = 0;
      for(int i = 0; i < PositionsTotal(); i++)
        {
         ulong ticket = PositionGetTicket(i);
         if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
           {
            datetime posTime = (datetime)PositionGetInteger(POSITION_TIME);
            if(oldestTime == 0 || posTime < oldestTime)
              {
               oldestTime = posTime;
               firstOrderPrice = PositionGetDouble(POSITION_PRICE_OPEN);
               currentType = PositionGetInteger(POSITION_TYPE);
              }
           }
        }
     }

   // -------------------------------------------------------------
   // MÁQUINA DE DCA (Se já temos 1 a 5 ordens abertas)
   // -------------------------------------------------------------
   if(openOrders > 0 && openOrders < 6)
     {
      double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      
      double priceDiffPct = 0;
      bool isAgainstUs = false;
      double executionPrice = 0;

      if(currentType == POSITION_TYPE_BUY)
        {
         priceDiffPct = (currentBid - firstOrderPrice) / firstOrderPrice;
         if(priceDiffPct < 0) isAgainstUs = true;
         executionPrice = currentAsk;
        }
      else if(currentType == POSITION_TYPE_SELL)
        {
         priceDiffPct = (currentAsk - firstOrderPrice) / firstOrderPrice;
         if(priceDiffPct > 0) isAgainstUs = true;
         executionPrice = currentBid;
        }

      if(isAgainstUs)
        {
         double dropMagnitude = MathAbs(priceDiffPct);
         double targetDrop = DCADrops[openOrders - 1]; // Índice 0 é para a ordem 2

         if(dropMagnitude >= targetDrop)
           {
            double tpDist = DCATPs[openOrders - 1];
            double tpPrice = 0;

            if(currentType == POSITION_TYPE_BUY)
              {
               tpPrice = NormalizeDouble(executionPrice * (1.0 + tpDist), _Digits);
               trade.Buy(InpLotSize, _Symbol, executionPrice, 0, tpPrice);
              }
            else
              {
               tpPrice = NormalizeDouble(executionPrice * (1.0 - tpDist), _Digits);
               trade.Sell(InpLotSize, _Symbol, executionPrice, 0, tpPrice);
              }
            
            Print("📉 [DCA ATIVADO] Preço recuou. Abrindo Ordem ", openOrders + 1, " com TP: ", tpPrice);
           }
        }
     }

   // -------------------------------------------------------------
   // MÁQUINA DE SINAIS - ORDEM 1 (Se não temos ordens abertas)
   // -------------------------------------------------------------
   if(openOrders == 0)
     {
      // Verifica se é uma nova vela de M5
      datetime currentM5Time = iTime(_Symbol, PERIOD_M5, 0);
      if(currentM5Time == 0) { Print("Aguardando carregar histórico M5..."); return; }
      if(currentM5Time == lastM5CandleTime) return; // Já avaliou essa vela

      double ema[1];
      double rsi[1];
      
      if(CopyBuffer(handleEma21, 0, 1, 1, ema) <= 0) { Print("Aguardando carregar EMA..."); return; }
      if(CopyBuffer(handleRsi14, 0, 1, 1, rsi) <= 0) { Print("Aguardando carregar RSI..."); return; }

      double closeH1 = iClose(_Symbol, PERIOD_H1, 1);
      if(closeH1 == 0) { Print("Aguardando carregar H1..."); return; }
      
      string trend = "LATERAL";
      if(closeH1 > ema[0]) trend = "TREND_UP";
      else if(closeH1 < ema[0]) trend = "TREND_DOWN";

      Print("🧠 [Sniper V2] H1 Tendência: ", trend, " | RSI(M5): ", DoubleToString(rsi[0], 1));

      double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double tpPrice = 0;

      if(trend == "TREND_UP" && rsi[0] >= 50)
        {
         tpPrice = NormalizeDouble(currentAsk + (currentAsk * 0.002), _Digits); // 0.2% a mais (Take Profit válido e seguro)
         Print("🔥 Sinal Disparado: COMPRA! TP calculado: ", tpPrice);
         trade.Buy(InpLotSize, _Symbol, currentAsk, 0, tpPrice);
         lastM5CandleTime = currentM5Time; // Trava para não atirar na mesma vela
        }
      else if(trend == "TREND_DOWN" && rsi[0] <= 50)
        {
         tpPrice = NormalizeDouble(currentBid - (currentBid * 0.002), _Digits); // 0.2% a menos (Take Profit válido e seguro)
         Print("🔥 Sinal Disparado: VENDA! TP calculado: ", tpPrice);
         trade.Sell(InpLotSize, _Symbol, currentBid, 0, tpPrice);
         lastM5CandleTime = currentM5Time; // Trava para não atirar na mesma vela
        }
     }
  }

//+------------------------------------------------------------------+
//| Função Auxiliar para fechar todas as ordens (Pânico)             |
//+------------------------------------------------------------------+
void CloseAll()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         trade.PositionClose(ticket);
        }
     }
  }

//+------------------------------------------------------------------+
//| Timer function (Webhook)                                         |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(InpLicenseKey == "" || InpServerUrl == "") return;
   
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double prof = GetDailyProfit();
   int openOrders = 0;
   double floatingPnL = 0;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         openOrders++;
         floatingPnL += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
        }
     }
     
   string json = "{\"license\":\"" + InpLicenseKey + "\",\"balance\":" + DoubleToString(bal,2) + ",\"equity\":" + DoubleToString(eq,2) + ",\"daily_profit\":" + DoubleToString(prof,2) + ",\"open_orders\":" + IntegerToString(openOrders) + ",\"floating_pnl\":" + DoubleToString(floatingPnL,2);
   
   string tradesJson = ",\"trades\":[";
   bool firstTrade = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         ulong ticket = PositionGetTicket(i);
         string typeStr = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "buy" : "sell";
         double volume = PositionGetDouble(POSITION_VOLUME);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double pnl = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
         datetime time = (datetime)PositionGetInteger(POSITION_TIME);
         
         if(!firstTrade) tradesJson += ",";
         tradesJson += "{";
         tradesJson += "\"id\":\"" + IntegerToString(ticket) + "\",";
         tradesJson += "\"symbol\":\"" + _Symbol + "\",";
         tradesJson += "\"type\":\"" + typeStr + "\",";
         tradesJson += "\"amount\":" + DoubleToString(volume, 2) + ",";
         tradesJson += "\"entryPrice\":" + DoubleToString(openPrice, _Digits) + ",";
         tradesJson += "\"profit\":" + DoubleToString(pnl, 2) + ",";
         tradesJson += "\"status\":\"OPEN\",";
         tradesJson += "\"openTime\":" + IntegerToString((long)time * 1000);
         tradesJson += "}";
         firstTrade = false;
        }
     }
   tradesJson += "]";
   json += tradesJson + "}";
   char data[];
   char result[];
   string result_headers;
   StringToCharArray(json, data, 0, StringLen(json), CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   int res = WebRequest("POST", InpServerUrl, headers, 1000, data, result, result_headers);
   
   if(res != 200) {
      Print("Erro ao enviar Webhook. Código: ", res);
   }
  }
//+------------------------------------------------------------------+
