//+------------------------------------------------------------------+
//|                                                Fybot_Sniper.mq5 |
//|                                           1x1 Scalper Dinâmico   |
//|                                        (Versão corrigida)        |
//+------------------------------------------------------------------+
#property copyright "Fybot Sniper"
#property link      "https://fybot.life"
#property version   "2.01"

#include <Trade\Trade.mqh>

enum ENUM_LOT_MODE
  {
   LOT_FIXED = 0,    // Lote Fixo Travado (0.01)
   LOT_DYNAMIC = 1   // Lote Dinâmico (Risco % da Banca)
  };
input group "=== Licenciamento ==="
input string   InpLicenseKey = "";                                // Token / E-mail da Licença Fybot
input string   InpServerUrl  = "https://fybot.life/api/mt5-webhook"; // URL do Servidor

input group "=== Configurações da Estratégia ==="
input ENUM_LOT_MODE      InpLotMode = LOT_DYNAMIC;   // Gerenciamento de Lote
input double             InpRiskPct = 1.0;           // Volume da Banca (%) - Se Dinâmico
input double   InpMaxSLDollars = 20.0;       // Stop Loss Máximo Diário ($)
input double   InpTakeProfitPct = 0.05;      // Alvo de Lucro Inicial (%)
input double   InpDailyTargetPct = 10.0;     // Meta Diária de Lucro (%)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = 0.01;
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;
int            currentDay = -1; // CORRIGIDO: usado para detectar virada de dia
datetime       cooldownEndTime = 0; // Bloqueio temporário após Stop Loss

// Handles de Indicadores
int            handleEma14;
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

   // IGUALANDO LÓGICA COM A API: EMA 14/21 e RSI no M15
   handleEma14 = iMA(_Symbol, PERIOD_M15, 14, 0, MODE_EMA, PRICE_CLOSE);
   handleEma21 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleRsi14 = iRSI(_Symbol, PERIOD_M15, 14, PRICE_CLOSE);

   if(handleEma14 == INVALID_HANDLE || handleEma21 == INVALID_HANDLE || handleRsi14 == INVALID_HANDLE)
     {
      Print("Erro ao carregar indicadores.");
      return(INIT_FAILED);
     }

   Print("Fybot Sniper EA Inicializado! Banca Inicial: $", DoubleToString(initialBalance, 2));
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Atualiza horário de meia-noite para controle de lucro diário     |
//| CORRIGIDO: agora também reseta initialBalance quando o dia vira, |
//| já que antes a meta diária e o lucro diário ficavam calculados   |
//| sobre o saldo do momento em que o EA foi ligado, e não do início |
//| do dia atual (quebra em EAs que rodam vários dias seguidos).     |
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
         // CORRIGIDO: removido bloco morto que comparava POSITION_TIME (data/hora)
         // com firstOrderPrice (preço) — não fazia sentido e não tinha efeito algum.
         // A ordem âncora já é corretamente encontrada na varredura abaixo.
        }
     }

   // Varredura para encontrar a Ordem "Âncora" (Primeira ordem) e Calcular Preço Médio
   double totalVolume = 0;
   double totalOpenPriceValue = 0;
   
   if(openOrders > 0)
     {
      datetime oldestTime = 0;
      for(int i = 0; i < PositionsTotal(); i++)
        {
         ulong ticket = PositionGetTicket(i);
         if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
           {
            double posVolume = PositionGetDouble(POSITION_VOLUME);
            double posPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            totalVolume += posVolume;
            totalOpenPriceValue += (posPrice * posVolume);

            datetime posTime = (datetime)PositionGetInteger(POSITION_TIME);
            if(oldestTime == 0 || posTime < oldestTime)
              {
               oldestTime = posTime;
               firstOrderPrice = posPrice;
               currentType = PositionGetInteger(POSITION_TYPE);
              }
           }
        }
        
      // -- Lógica DCA e Fechamento Global --
      double avgPrice = totalOpenPriceValue / totalVolume;
      
      double drawdownPct = 0;
      double profitPct = 0;
      
      if(currentType == POSITION_TYPE_BUY)
        {
         drawdownPct = (firstOrderPrice - currentBid) / firstOrderPrice;
         profitPct = (currentBid - avgPrice) / avgPrice;
        }
      else if (currentType == POSITION_TYPE_SELL)
        {
         drawdownPct = (currentAsk - firstOrderPrice) / firstOrderPrice;
         profitPct = (avgPrice - currentAsk) / avgPrice;
        }

      // 1. TP Global e SL Global
      if (profitPct >= 0.0004) // +0.04% a partir do Preço Médio
        {
         Print("🏆 [TP GLOBAL] Lucro alvo atingido no Preço Médio! Fechando a cesta.");
         CloseAll();
         return; 
        }
      else if (drawdownPct >= 0.0020) // -0.20% a partir da Ordem Mestra
        {
         Print("🛑 [SL GLOBAL] Perda máxima de 0.20% atingida na Ordem Mestra. Protegendo capital!");
         CloseAll();
         cooldownEndTime = TimeCurrent() + (15 * 60); // 15 minutos
         return; 
        }

      // 2. DCA (Ordens 2, 3, 4)
      if (openOrders < 4)
        {
         bool openDca = false;
         if (drawdownPct >= 0.0004 && openOrders == 1) openDca = true;
         else if (drawdownPct >= 0.0008 && openOrders == 2) openDca = true;
         else if (drawdownPct >= 0.0012 && openOrders == 3) openDca = true;

         if (openDca)
           {
            double dcaLot = 0.01;
            if(InpLotMode == LOT_DYNAMIC)
              {
               dcaLot = (AccountInfoDouble(ACCOUNT_BALANCE) / 10000.0) * InpRiskPct;
               double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
               if(step > 0) dcaLot = MathFloor(dcaLot / step) * step;
               double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
               double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
               if(dcaLot < minLot) dcaLot = minLot;
               if(maxLot > 0 && dcaLot > maxLot) dcaLot = maxLot;
               dcaLot = NormalizeDouble(dcaLot, 2);
              }
              
            if (currentType == POSITION_TYPE_BUY)
              {
               if(trade.Buy(dcaLot, _Symbol, currentAsk, 0, 0))
                  Print("📉 [DCA] Recuo atingido. Abrindo Ordem ", openOrders + 1, "!");
              }
            else if (currentType == POSITION_TYPE_SELL)
              {
               if(trade.Sell(dcaLot, _Symbol, currentBid, 0, 0))
                  Print("📉 [DCA] Recuo atingido. Abrindo Ordem ", openOrders + 1, "!");
              }
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

      // --- Cooldown (Pausa) após Stop Loss ---
      if(TimeCurrent() < cooldownEndTime)
        {
         return; // Está de castigo esperando o mercado acalmar
        }

      // Verifica se a última ordem fechada deu prejuízo para ativar o Cooldown
      HistorySelect(TimeCurrent() - 3600, TimeCurrent());
      int histTotal = HistoryDealsTotal();
      if(histTotal > 0)
        {
         ulong lastTicket = HistoryDealGetTicket(histTotal - 1);
         if(HistoryDealGetInteger(lastTicket, DEAL_MAGIC) == InpMagicNumber)
           {
            double lastProfit = HistoryDealGetDouble(lastTicket, DEAL_PROFIT) + HistoryDealGetDouble(lastTicket, DEAL_SWAP);
            long dealEntry = HistoryDealGetInteger(lastTicket, DEAL_ENTRY);
            // Se foi uma saída de mercado com perda
            if((dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT) && lastProfit < -0.1)
              {
               Print("🚨 Última ordem bateu no Stop Loss! Ativando pausa de 15 minutos de segurança...");
               cooldownEndTime = TimeCurrent() + (15 * 60); // 15 minutos
               return;
              }
           }
        }

      // Verifica se é uma nova vela de M15
      datetime currentM15Time = iTime(_Symbol, PERIOD_M15, 0);
      if(currentM15Time == lastM5CandleTime) return; // Já avaliou essa vela

      double ema14[1];
      double ema21[1];
      double rsi[1];

      // Pega o valor ATUAL (índice 0) dos indicadores para não ter atraso
      if(CopyBuffer(handleEma14, 0, 0, 1, ema14) <= 0) return;
      if(CopyBuffer(handleEma21, 0, 0, 1, ema21) <= 0) return;
      if(CopyBuffer(handleRsi14, 0, 0, 1, rsi) <= 0) return;

      string trend = "LATERAL";
      if(currentAsk > ema14[0] && ema14[0] > ema21[0]) trend = "TREND_UP";
      else if(currentBid < ema14[0] && ema14[0] < ema21[0]) trend = "TREND_DOWN";

      Print("🧠 [Sniper V2] M15 Tendência: ", trend, " | RSI(M15): ", DoubleToString(rsi[0], 1));

      // --- Cálculo do Lote Dinâmico ---
      if(InpLotMode == LOT_DYNAMIC)
        {
         // Cálculo Corrigido: 0.01 de lote para cada $100 de banca (com InpRiskPct = 1.0)
         currentLotSize = (AccountInfoDouble(ACCOUNT_BALANCE) / 10000.0) * InpRiskPct;
         
         double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
         if(step > 0) currentLotSize = MathFloor(currentLotSize / step) * step;
         
         double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
         double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
         if(currentLotSize < minLot) currentLotSize = minLot;
         if(maxLot > 0 && currentLotSize > maxLot) currentLotSize = maxLot;
         currentLotSize = NormalizeDouble(currentLotSize, 2);
        }
      else
        {
         currentLotSize = 0.01; // Modo Fixo
        }

      // --- Lógica a Favor da Tendência ---
      if(trend == "TREND_UP" && rsi[0] <= 30)
        {
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, 0, 0)) // TP e SL no EA
           {
            Print("🔥 Sinal Disparado: COMPRA (Ordem 1)! Lote: ", currentLotSize);
            lastM5CandleTime = currentM15Time;
           }
         else
           {
            Print("❌ Erro ao abrir COMPRA: ", GetLastError());
           }
        }
      else if(trend == "TREND_DOWN" && rsi[0] >= 70)
        {
         if(trade.Sell(currentLotSize, _Symbol, currentBid, 0, 0)) // TP e SL no EA
           {
            Print("🔥 Sinal Disparado: VENDA (Ordem 1)! Lote: ", currentLotSize);
            lastM5CandleTime = currentM15Time;
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

   // CORRIGIDO: antes calculava "equity - initialBalance", que é uma conta
   // diferente da usada pela lógica de trading (GetDailyProfit(), que soma
   // negociações fechadas desde a meia-noite). Isso fazia o dashboard e o
   // EA mostrarem/usarem números de lucro diário divergentes. Agora ambos
   // usam a mesma função.
   double daily_profit = GetDailyProfit();

   int open_orders = 0;
   string trades_json = "[";

   for(int i=0; i<PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         if(open_orders > 0) trades_json += ",";

         double profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
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