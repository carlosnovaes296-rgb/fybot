//+------------------------------------------------------------------+
//|                                                Fybot_Sniper.mq5 |
//|                                           1x1 Scalper Dinâmico   |
//+------------------------------------------------------------------+
#property copyright "Fybot Sniper"
#property link      "https://fybot.life"
#property version   "2.00"

#include <Trade\Trade.mqh>

enum ENUM_STRATEGY_MODE
  {
   MODE_DCA = 0,     // DCA Institucional (Até 4 Ordens, SL 0.30%)
   MODE_SCALPER = 1  // 1x1 Scalper Puro (Sem DCA, SL 0.04%)
  };

enum ENUM_LOT_MODE
  {
   LOT_FIXED = 0,    // Lote Fixo Travado (0.01)
   LOT_DYNAMIC = 1   // Lote Dinâmico (Risco % da Banca)
  };
input group "=== Licenciamento ==="
input string   InpLicenseKey = "";                                // Token / E-mail da Licença Fybot
input string   InpServerUrl  = "https://fybot.life/api/mt5-webhook"; // URL do Servidor

input group "=== Configurações da Estratégia ==="
ENUM_STRATEGY_MODE InpStrategyMode = MODE_SCALPER; // Travado no modo Scalper
input ENUM_LOT_MODE      InpLotMode = LOT_DYNAMIC;   // Gerenciamento de Lote
input double             InpRiskPct = 2.0;           // Risco da Banca (%) - Se Dinâmico
input double   InpMaxSLDollars = 20.0;       // Stop Loss Máximo Diário ($)
input double   InpTakeProfitPct = 0.04;      // Alvo de Lucro Inicial (TP % - 0.04)
input double   InpDailyTargetPct = 3.0;      // Meta Diária de Lucro (%)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = 0.01; 
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;

// Configurações do DCA (Máximo de 4 ordens -> 3 DCAs)
double         DCADrops[3] = {0.0005, 0.0010, 0.0015};
double         DCATPs[3]   = {0.0004, 0.0004, 0.0004};

// Handles de Indicadores
int            handleEma21;
int            handleRsi14;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(InpLicenseKey == "")
     {
      Print("❌ ERRO: Chave de Licença não informada! O robô não pode ser iniciado.");
      return(INIT_FAILED);
     }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
     
   EventSetTimer(5); // Inicia o timer para sincronizar com o site a cada 5 segundos

   Print("✅ Fybot Sniper [1x1 Dinâmico] Iniciado com Sucesso!");
   
   UpdateMidnightTime();

   handleEma21 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleRsi14 = iRSI(_Symbol, PERIOD_M1, 14, PRICE_CLOSE);

   if(handleEma21 == INVALID_HANDLE || handleRsi14 == INVALID_HANDLE)
     {
      Print("Erro ao carregar indicadores.");
      return(INIT_FAILED);
     }

   Print("Fybot Sniper EA Inicializado! Banca Inicial: $", DoubleToString(initialBalance, 2));
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
         long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
         if(dealType != DEAL_TYPE_BALANCE)
           {
            totalProfit += HistoryDealGetDouble(ticket, DEAL_PROFIT);
            totalProfit += HistoryDealGetDouble(ticket, DEAL_SWAP);
            totalProfit += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
           }
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

   double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point;
   if (spread == 0) spread = (currentAsk - currentBid);
   double minStopDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if (minStopDist < spread * 2) minStopDist = spread * 2;

   // Verifica Violinada (SL em Dólares) e calcula o estado atual
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
         
         // Proteção de Violinada (Corta 1 ordem individualmente apenas no Lote Fixo)
         if(InpLotMode == LOT_FIXED && InpMaxSLDollars > 0 && posPnL <= -InpMaxSLDollars)
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
   // MÁQUINA DE DCA (Máximo Absoluto de 4 Ordens)
   // -------------------------------------------------------------
   if(InpStrategyMode == MODE_DCA && openOrders > 0 && openOrders < 4)
     {

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
                double targetDist = executionPrice * tpDist;
                if(targetDist <= minStopDist) targetDist = minStopDist + (_Point * 20);
                tpPrice = executionPrice + targetDist;
                
                if(trade.Buy(currentLotSize, _Symbol, executionPrice, 0, 0)) {
                   Print("🛡️ [DCA V2] Ordem de COMPRA #", openOrders + 1, " aberta!");
                   UpdateAllPositionsTP(tpPrice);
                }
               }
             else
               {
                double targetDist = executionPrice * tpDist;
                if(targetDist <= minStopDist) targetDist = minStopDist + (_Point * 20);
                tpPrice = executionPrice - targetDist;
                
                if(trade.Sell(currentLotSize, _Symbol, executionPrice, 0, 0)) {
                   Print("🛡️ [DCA V2] Ordem de VENDA #", openOrders + 1, " aberta!");
                   UpdateAllPositionsTP(tpPrice);
                }
               }
            
            Print("📉 [DCA ATIVADO] Preço recuou. Abrindo Ordem ", openOrders + 1);
           }
        }
     }

   // -------------------------------------------------------------
   // MÁQUINA DE SINAIS - ORDEM 1 (Se não temos ordens abertas)
   // -------------------------------------------------------------
   if(openOrders == 0)
     {
      // Verifica se é uma nova vela de M1
      datetime currentM5Time = iTime(_Symbol, PERIOD_M1, 0);
      if(currentM5Time == lastM5CandleTime) return; // Já avaliou essa vela

      double ema[1];
      double rsi[1];
      
      // Pega o valor ATUAL (índice 0) dos indicadores para não ter atraso
      if(CopyBuffer(handleEma21, 0, 0, 1, ema) <= 0) return;
      if(CopyBuffer(handleRsi14, 0, 0, 1, rsi) <= 0) return;
      
      string trend = "LATERAL";
      if(currentAsk > ema[0]) trend = "TREND_UP";
      else if(currentBid < ema[0]) trend = "TREND_DOWN";

      Print("🧠 [Sniper V2] M15 Tendência: ", trend, " | RSI(M1): ", DoubleToString(rsi[0], 1));

      double tpPrice = 0;


      double tpDist = currentAsk * (InpTakeProfitPct / 100.0);
      if(tpDist <= minStopDist) tpDist = minStopDist + (_Point * 20);
      
      double internalSLPct = 0.30; // Stop Loss Fixo em 0.30%
      if(InpStrategyMode == MODE_SCALPER)
        {
         internalSLPct = 0.04; // No modo Scalper o SL é curtinho (0.04% - 1x1 Puro)
        }
        
      double slDist = currentAsk * (internalSLPct / 100.0);
      if(slDist <= minStopDist) slDist = minStopDist + (_Point * 20);

      // --- Cálculo do Lote Dinâmico ---
      if(InpLotMode == LOT_DYNAMIC)
        {
         double riskAmount = AccountInfoDouble(ACCOUNT_BALANCE) * (InpRiskPct / 100.0);
         double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
         double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
         if(tickSize > 0 && tickValue > 0)
           {
            double lossPerLot = (slDist / tickSize) * tickValue;
            if(lossPerLot > 0)
              {
               currentLotSize = riskAmount / lossPerLot;
               double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
               if(step > 0) currentLotSize = MathFloor(currentLotSize / step) * step;
              }
           }
         double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
         if(currentLotSize < minLot) currentLotSize = minLot;
        }
      else
        {
         currentLotSize = 0.01; // Modo Fixo
        }

      // --- Lógica de Retração Inteligente (Pullback) ---
      if(trend == "TREND_UP" && rsi[0] <= 30)
        {
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, 0, 0)) {
            Print("🔥 Sinal Disparado: COMPRA (Segura)! Lote: ", currentLotSize);
            ulong ticket = trade.ResultOrder();
            if(ticket > 0 || trade.ResultDeal() > 0) {
               ulong posTicket = PositionGetTicket(PositionsTotal()-1);
               double posOpenPrice = PositionGetDouble(POSITION_PRICE_OPEN);
               trade.PositionModify(posTicket, posOpenPrice - slDist, posOpenPrice + tpDist);
            }
            lastM5CandleTime = currentM5Time; 
         } else {
            Print("❌ Erro ao abrir COMPRA: ", GetLastError());
         }
        }
      else if(trend == "TREND_DOWN" && rsi[0] >= 70)
        {
         if(trade.Sell(currentLotSize, _Symbol, currentBid, 0, 0)) {
            Print("🔥 Sinal Disparado: VENDA (Segura)! Lote: ", currentLotSize);
            ulong ticket = trade.ResultOrder();
            if(ticket > 0 || trade.ResultDeal() > 0) {
               ulong posTicket = PositionGetTicket(PositionsTotal()-1);
               double posOpenPrice = PositionGetDouble(POSITION_PRICE_OPEN);
               trade.PositionModify(posTicket, posOpenPrice + slDist, posOpenPrice - tpDist);
            }
            lastM5CandleTime = currentM5Time;
         } else {
            Print("❌ Erro ao abrir VENDA: ", GetLastError());
         }
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
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

//+------------------------------------------------------------------+
//| Timer function (Sincronismo com a Nuvem)                         |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SyncWithServer();
  }

//+------------------------------------------------------------------+
//| Sincronização com o Dashboard via WebHook                        |
//+------------------------------------------------------------------+
void SyncWithServer()
  {
   if(InpServerUrl == "" || InpLicenseKey == "") return;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   
   // Calcular lucro do dia (Simplificado pelo equity - initial, ou iterando history)
   double daily_profit = equity - initialBalance;
   
   int open_orders = 0;
   string trades_json = "[";
   
   for(int i=0; i<PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         if(open_orders > 0) trades_json += ",";
         
         double profit = PositionGetDouble(POSITION_PROFIT);
         double volume = PositionGetDouble(POSITION_VOLUME);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         string symbol = PositionGetString(POSITION_SYMBOL);
         long type_int = PositionGetInteger(POSITION_TYPE);
         string type_str = (type_int == POSITION_TYPE_BUY) ? "buy" : "sell";
         
         trades_json += "{";
         trades_json += "\"id\":\"" + IntegerToString(ticket) + "\",";
         trades_json += "\"type\":\"" + type_str + "\",";
         trades_json += "\"lot\":" + DoubleToString(volume, 2) + ",";
         trades_json += "\"symbol\":\"" + symbol + "\",";
         trades_json += "\"open_price\":" + DoubleToString(open_price, 5) + ",";
         trades_json += "\"profit\":" + DoubleToString(profit, 2);
         trades_json += "}";
         open_orders++;
        }
     }
   trades_json += "]";

   string json = "{";
   json += "\"license\":\"" + InpLicenseKey + "\",";
   json += "\"balance\":" + DoubleToString(balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(equity, 2) + ",";
   json += "\"daily_profit\":" + DoubleToString(daily_profit, 2) + ",";
   json += "\"open_orders\":" + IntegerToString(open_orders) + ",";
   json += "\"trades\":" + trades_json;
   json += "}";

   char post[], result[];
   string result_headers;
   string headers = "Content-Type: application/json\r\n";
   
   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1); // Remove o \0 do final da string
   
   int res = WebRequest("POST", InpServerUrl, headers, 5000, post, result, result_headers);
   
   if(res != 200)
     {
      Print("❌ Falha ao enviar Webhook (", res, "). Retentando na próxima...");
     }
  }

//+------------------------------------------------------------------+
//| Função para atualizar o TP de todas as posições no DCA           |
//+------------------------------------------------------------------+
void UpdateAllPositionsTP(double newTP)
  {
   for(int i = PositionsTotal()-1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)
        {
         double sl = PositionGetDouble(POSITION_SL);
         trade.PositionModify(ticket, sl, newTP);
        }
     }
  }
//+------------------------------------------------------------------+
