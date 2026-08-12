//+------------------------------------------------------------------+
//|                                                   Fybot_Pro.mq5 |
//|                                        Institucional DCA Sniper |
//|                                        (Versão corrigida)        |
//+------------------------------------------------------------------+
#property copyright "Fybot Pro"
#property link      "https://fybot.life"
#property version   "2.01"

#include <Trade\Trade.mqh>


enum ENUM_LOT_MODE { LOT_FIXED, LOT_DYNAMIC };

input group "=== Licenciamento ==="
input string   InpLicenseKey = "";                                // Token / E-mail da Licença Fybot
input string   InpServerUrl  = "https://fybot.life/api/mt5-webhook-dca"; // ROTA SECRETA (DCA)

input group "=== Configurações da Estratégia ==="
input ENUM_LOT_MODE InpLotMode = LOT_FIXED;  // Modo de Lote
input double   InpRiskPct = 1.0;             // Volume da Banca (%) - Se Dinâmico
input double   InpLotSize = 0.01;            // Tamanho do Lote Fixo
input double   InpMaxSLDollars = 20.0;       // Stop Loss Máximo Diário ($)
input double   InpTakeProfitPct = 0.04;      // Alvo de Lucro Inicial (%)
input double   InpDailyTargetPct = 4.0;      // Meta Diária de Lucro (%)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = InpLotSize;
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;
int            currentDay = -1; // CORRIGIDO: usado para detectar virada de dia

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

   Print("✅ Fybot Pro [Sniper V2] Iniciado com Sucesso!");

   UpdateMidnightTime();

   // CORREÇÃO CRÍTICA: EMA DEVE ser M15. Se usar M1, o preço cruza a EMA antes do RSI dar o sinal, e o robô nunca abre ordem!
   handleEma21 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleRsi14 = iRSI(_Symbol, PERIOD_M1, 14, PRICE_CLOSE);

   if(handleEma21 == INVALID_HANDLE || handleRsi14 == INVALID_HANDLE)
     {
      Print("Erro ao carregar indicadores.");
      return(INIT_FAILED);
     }

   Print("Fybot Pro EA Inicializado! Banca Inicial: $", DoubleToString(initialBalance, 2));
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Atualiza horário de meia-noite para controle de lucro diário     |
//| CORRIGIDO: reseta initialBalance quando o dia vira (antes ficava  |
//| preso ao saldo do momento em que o EA foi ligado, quebrando a     |
//| meta diária e o lucro diário em EAs que rodam vários dias).       |
//+------------------------------------------------------------------+
void UpdateMidnightTime()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(currentDay != dt.day_of_year)
     {
      currentDay = dt.day_of_year;
      initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
     }

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
//| Função para atualizar TP de todas as posições DCA                |
//+------------------------------------------------------------------+
void UpdateAllPositionsTP(double newTP)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         trade.PositionModify(ticket, PositionGetDouble(POSITION_SL), newTP);
        }
     }
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

         // Proteção de Violinada (Corta 1 ordem individualmente)
         if(InpMaxSLDollars > 0 && posPnL <= -InpMaxSLDollars)
           {
            Print("🚨 [VIOLINADA] Ordem perdeu $", DoubleToString(-posPnL, 2), ". Fechando imediatamente!");
            trade.PositionClose(ticket);
            continue;
           }

         openOrders++;
         floatingPnL += posPnL;
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
   if(openOrders > 0 && openOrders < 4)
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

      // --- Cálculo do Lote Dinâmico ---
      if(InpLotMode == LOT_DYNAMIC)
        {
         // Novo cálculo direto: Lote = X% da Banca (onde X é o InpRiskPct)
         currentLotSize = AccountInfoDouble(ACCOUNT_BALANCE) * (InpRiskPct / 100.0);
         
         double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
         if(step > 0) currentLotSize = MathFloor(currentLotSize / step) * step;
         
         double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
         if(currentLotSize < minLot) currentLotSize = minLot;
        }
      else
        {
         currentLotSize = InpLotSize;
        }

      if(isAgainstUs)
        {
         double dropMagnitude = MathAbs(priceDiffPct);
         double targetDrop = DCADrops[openOrders - 1]; // Índice 0 é para a ordem 2

         if(dropMagnitude >= targetDrop)
           {
            double tpDist = DCATPs[openOrders - 1];
            double tpPrice = 0;

            double newOrderSLDist = executionPrice * (0.30 / 100.0);
            if(newOrderSLDist <= minStopDist) newOrderSLDist = minStopDist + (_Point * 20);

             if(currentType == POSITION_TYPE_BUY)
               {
                double targetDist = executionPrice * tpDist;
                if(targetDist <= minStopDist) targetDist = minStopDist + (_Point * 20);
                tpPrice = executionPrice + targetDist;
                double newOrderSL = executionPrice - newOrderSLDist;

                if(trade.Buy(currentLotSize, _Symbol, executionPrice, newOrderSL, tpPrice))
                  {
                   Print("🛡️ [DCA V2] Ordem de COMPRA #", openOrders + 1, " aberta!");
                   UpdateAllPositionsTP(tpPrice);
                  }
               }
             else
               {
                double targetDist = executionPrice * tpDist;
                if(targetDist <= minStopDist) targetDist = minStopDist + (_Point * 20);
                tpPrice = executionPrice - targetDist;
                double newOrderSL = executionPrice + newOrderSLDist;

                if(trade.Sell(currentLotSize, _Symbol, executionPrice, newOrderSL, tpPrice))
                  {
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
      // --- Trava de Meta Diária ---
      if(dailyProfit >= dailyTarget)
        {
         // Meta batida, não abre mais ordens novas hoje
         return;
        }

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

      double tpDist = currentAsk * (InpTakeProfitPct / 100.0);
      if(tpDist <= minStopDist) tpDist = minStopDist + (_Point * 20);

      double internalSLPct = 0.30; // Stop Loss Fixo em 0.30%

      double slDist = currentAsk * (internalSLPct / 100.0);
      if(slDist <= minStopDist) slDist = minStopDist + (_Point * 20);

      // --- Lote Fixo Travado ---
      currentLotSize = InpLotSize;

      // --- Lógica a Favor da Tendência (M1) ---
      // Se a tendência é de ALTA (preço acima da EMA M1), ele espera o RSI cair (pullback) para COMPRAR
      if(trend == "TREND_UP" && rsi[0] <= 49)
        {
         double buySL = currentAsk - slDist;
         double buyTP = currentAsk + tpDist;
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, buySL, buyTP))
           {
            Print("🔥 Sinal Disparado: COMPRA (A Favor da Tendência)! Lote: ", currentLotSize);
            lastM5CandleTime = currentM5Time;
           }
         else
           {
            Print("❌ Erro ao abrir COMPRA: ", GetLastError());
           }
        }
      // Se a tendência é de BAIXA (preço abaixo da EMA M1), ele espera o RSI subir (pullback) para VENDER
      else if(trend == "TREND_DOWN" && rsi[0] >= 51)
        {
         double sellSL = currentBid + slDist;
         double sellTP = currentBid - tpDist;
         if(trade.Sell(currentLotSize, _Symbol, currentBid, sellSL, sellTP))
           {
            Print("🔥 Sinal Disparado: VENDA (Segura)! Lote: ", currentLotSize);
            lastM5CandleTime = currentM5Time;
           }
         else
           {
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

   // CORRIGIDO: antes calculava "equity - initialBalance" (divergente do
   // GetDailyProfit() usado pela lógica de trading). Agora ambos usam a
   // mesma função, então o dashboard e o EA mostram o mesmo número.
   double daily_profit = GetDailyProfit();

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

   // Capture last 10 closed trades today to ensure fast scalps are not missed
   HistorySelect(midnightTime, TimeCurrent());
   int histTotal = HistoryDealsTotal();
   string closed_json = "[";
   int closed_count = 0;
   
   for(int i = histTotal - 1; i >= 0 && closed_count < 10; i--)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagicNumber)
        {
         long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
           {
            if(closed_count > 0) closed_json += ",";
            
            double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT) + HistoryDealGetDouble(ticket, DEAL_SWAP) + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
            double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
            double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
            string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
            long pos_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
            
            // Revert deal type to show original position type
            long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
            string type_str = (dealType == DEAL_TYPE_BUY) ? "sell" : "buy"; 
            
            closed_json += "{";
            closed_json += "\"id\":\"" + IntegerToString(pos_id) + "\",";
            closed_json += "\"type\":\"" + type_str + "\",";
            closed_json += "\"lot\":" + DoubleToString(volume, 2) + ",";
            closed_json += "\"symbol\":\"" + symbol + "\",";
            closed_json += "\"open_price\":" + DoubleToString(price, 5) + ",";
            closed_json += "\"profit\":" + DoubleToString(profit, 2);
            closed_json += "}";
            closed_count++;
           }
        }
     }
   closed_json += "]";

   string json = "{";
   json += "\"license\":\"" + InpLicenseKey + "\",";
   json += "\"balance\":" + DoubleToString(balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(equity, 2) + ",";
   json += "\"daily_profit\":" + DoubleToString(daily_profit, 2) + ",";
   json += "\"open_orders\":" + IntegerToString(open_orders) + ",";
   json += "\"trades\":" + trades_json + ",";
   json += "\"closed_trades\":" + closed_json;
   json += "}";

   char post[], result[];
   string result_headers;
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1); // Remove o \0 do final da string

   int res = WebRequest("POST", InpServerUrl, headers, 5000, post, result, result_headers);

   if(res != 200)
     {
      // Nota: se res == -1, o erro mais comum é a URL não estar cadastrada em
      // Ferramentas > Opções > Expert Advisors > "Permitir WebRequest para as URLs".
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
         // CORRIGIDO: verifica retorno de PositionModify() e loga falhas
         // (ex: stop inválido/muito próximo), que antes passavam em silêncio.
         if(!trade.PositionModify(ticket, sl, newTP))
           {
            Print("❌ Erro ao atualizar TP da posição #", ticket, ": ", GetLastError());
           }
        }
     }
  }
//+------------------------------------------------------------------+