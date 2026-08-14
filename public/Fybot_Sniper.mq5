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
input double   InpDailyTargetPct = 10.0;     // Meta Diária de Lucro (%)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

input group "=== Gestão de Risco (Trailing/Exaustão) ==="
input double   InpBreakevenArmPoints = 50.0;       // Lucro (pontos) para Breakeven
input double   InpBreakEvenOffsetPoints = 10.0;    // Distância do Breakeven (pontos)
input double   InpTrailMultiplier = 1.5;           // Multiplicador do Trailing
input int      InpTrailLookback = 5;               // Velas para Volatilidade do Trailing
input double   InpExhaustionVolumeDropPct = 30.0;  // Queda de Volume (%) para Exaustão
input double   InpExhaustionWickRatio = 0.5;       // Proporção do Pavio para Exaustão
input int      InpConsolidationLookback = 5;       // Velas para detectar Consolidação
input double   InpConsolidationRangeRatio = 1.2;   // Razão de consolidação (range)
input double   InpConsolidationEmaGapRatio = 0.5;  // Gap máximo entre EMAs na consolidação

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = 0.01;
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;
int            currentDay = -1; // CORRIGIDO: usado para detectar virada de dia
datetime       cooldownEndTime = 0; // Bloqueio temporário após Stop Loss

double         peakPrice = 0;
bool           exhaustionTriggered = false;

// Handles de Indicadores
int            handleEma21;
int            handleEma8;

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

   // IGUALANDO LÓGICA COM A API: EMA 21 e EMA 8 no M15 (alterado conforme a API)
   handleEma21 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleEma8 = iMA(_Symbol, PERIOD_M15, 8, 0, MODE_EMA, PRICE_CLOSE);

   if(handleEma21 == INVALID_HANDLE || handleEma8 == INVALID_HANDLE)
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
//| Funções do Trailing Avançado                                     |
//+------------------------------------------------------------------+
bool IsExhaustion(long dir)
  {
   long vol1 = iVolume(_Symbol, PERIOD_M15, 1);
   long vol2 = iVolume(_Symbol, PERIOD_M15, 2);
   long vol3 = iVolume(_Symbol, PERIOD_M15, 3);
   double avgVolPrev = (vol2 + vol3) / 2.0;

   bool volumeCaindo = false;
   if(avgVolPrev > 0)
      volumeCaindo = (vol1 < avgVolPrev * (1.0 - InpExhaustionVolumeDropPct / 100.0));

   double open1 = iOpen(_Symbol, PERIOD_M15, 1);
   double close1 = iClose(_Symbol, PERIOD_M15, 1);
   double high1 = iHigh(_Symbol, PERIOD_M15, 1);
   double low1  = iLow(_Symbol, PERIOD_M15, 1);
   
   double body      = MathAbs(close1 - open1);
   double upperWick = high1 - MathMax(open1, close1);
   double lowerWick = MathMin(open1, close1) - low1;

   bool velaRejeicao = false;
   if(dir == POSITION_TYPE_BUY) velaRejeicao = (body > 0 && upperWick >= body * InpExhaustionWickRatio && upperWick > lowerWick);
   else                         velaRejeicao = (body > 0 && lowerWick >= body * InpExhaustionWickRatio && lowerWick > upperWick);

   return (volumeCaindo || velaRejeicao);
  }

double AverageCandleRange(int lookback)
  {
   double sum = 0;
   for(int i = 1; i <= lookback; i++)
     {
      sum += (iHigh(_Symbol, PERIOD_M15, i) - iLow(_Symbol, PERIOD_M15, i));
     }
   return (lookback > 0) ? (sum / lookback) : 0;
  }

bool IsAccumulationZone()
  {
   int lookback = InpConsolidationLookback;
   double highest = -1, lowest = -1;
   for(int i = 1; i <= lookback; i++)
     {
      double h = iHigh(_Symbol, PERIOD_M15, i);
      double l = iLow(_Symbol, PERIOD_M15, i);
      if(highest < 0 || h > highest) highest = h;
      if(lowest  < 0 || l < lowest)  lowest  = l;
     }
   double totalRange = highest - lowest;
   double avgRange = AverageCandleRange(lookback);
   if(avgRange <= 0) return false;

   bool precoParado = (totalRange <= avgRange * InpConsolidationRangeRatio);

   double ema21[1], ema8[1];
   if(CopyBuffer(handleEma21, 0, 1, 1, ema21) <= 0) return false;
   if(CopyBuffer(handleEma8, 0, 1, 1, ema8) <= 0) return false;

   double gap = MathAbs(ema8[0] - ema21[0]);
   bool emasConvergentes = (gap <= avgRange * InpConsolidationEmaGapRatio);

   return (precoParado && emasConvergentes);
  }

void ManageTrailingOne(ulong ticket)
  {
   if(!PositionSelectByTicket(ticket)) return;

   long   dir       = PositionGetInteger(POSITION_TYPE);
   int    digits    = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double currentSL = PositionGetDouble(POSITION_SL);
   double entry     = PositionGetDouble(POSITION_PRICE_OPEN);
   
   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * point;
   if (spread == 0) spread = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID));
   double minDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   if (minDist < spread * 2) minDist = spread * 2;

   if(peakPrice == 0) peakPrice = entry;

   double high0 = iHigh(_Symbol, PERIOD_M15, 0);
   double low0  = iLow(_Symbol, PERIOD_M15, 0);
   if(dir == POSITION_TYPE_BUY && high0 > peakPrice) peakPrice = high0;
   if(dir == POSITION_TYPE_SELL && low0 < peakPrice) peakPrice = low0;

   bool jaEstavaAtivo = exhaustionTriggered;
   bool acumulacao = IsAccumulationZone();
   if(IsExhaustion(dir) || acumulacao) exhaustionTriggered = true;

   if(!jaEstavaAtivo && exhaustionTriggered && acumulacao)
     {
      double ema21[1];
      if(CopyBuffer(handleEma21, 0, 0, 1, ema21) > 0)
        {
         double ema21SL = NormalizeDouble(ema21[0], digits);
         double bidNow = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double askNow = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double distAtual = (dir == POSITION_TYPE_BUY) ? (bidNow - ema21SL) : (ema21SL - askNow);
         bool melhoraEma21 = (dir == POSITION_TYPE_BUY) ? (currentSL == 0 || ema21SL > currentSL)
                                                        : (currentSL == 0 || ema21SL < currentSL);

         if(melhoraEma21 && distAtual >= minDist)
           {
            if(trade.PositionModify(ticket, ema21SL, PositionGetDouble(POSITION_TP)))
              {
               Print("🛡️ Zona de acumulação | SL movido para a EMA21: ", DoubleToString(ema21SL, digits));
               currentSL = ema21SL;
              }
           }
        }
     }

   double avancoFavoravel = (dir == POSITION_TYPE_BUY) ? (peakPrice - entry) : (entry - peakPrice);
   double avancoFavoravelPts = avancoFavoravel / point;

   double buffer;
   if(exhaustionTriggered)
     {
      buffer = minDist; // modo agressivo: colado ao pico
     }
   else if(avancoFavoravelPts >= InpBreakevenArmPoints)
     {
      // NOVA REGRA: Se engatou o Breakeven, permite perder apenas 10% do lucro máximo atingido!
      buffer = MathMax(avancoFavoravel * 0.10, minDist);
     }
   else
     {
      // Respira normalmente antes de engatar o lucro
      double avgRange = AverageCandleRange(InpTrailLookback);
      buffer = MathMax(avgRange * InpTrailMultiplier, minDist);
     }

   if(avancoFavoravelPts >= InpBreakevenArmPoints)
     {
      double beOffset = InpBreakEvenOffsetPoints * point;
      double beLevel = (dir == POSITION_TYPE_BUY) ? NormalizeDouble(entry + beOffset, digits) : NormalizeDouble(entry - beOffset, digits);
      bool beMelhora = (dir == POSITION_TYPE_BUY) ? (currentSL == 0 || beLevel > currentSL) : (currentSL == 0 || beLevel < currentSL);

      double bidNow = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double askNow = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double distBE = (dir == POSITION_TYPE_BUY) ? (bidNow - beLevel) : (beLevel - askNow);

      if(beMelhora && distBE >= minDist)
        {
         if(trade.PositionModify(ticket, beLevel, PositionGetDouble(POSITION_TP)))
           {
            Print("🛡️ Piso de Breakeven | SL movido para zero-a-zero: ", DoubleToString(beLevel, digits));
            currentSL = beLevel;
           }
        }
     }

   if(avancoFavoravel <= minDist) return; 

   double newLevel = (dir == POSITION_TYPE_BUY) ? NormalizeDouble(peakPrice - buffer, digits)
                                                : NormalizeDouble(peakPrice + buffer, digits);

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentPrice = (dir == POSITION_TYPE_BUY) ? bid : ask;
   double distToCurrent = (dir == POSITION_TYPE_BUY) ? (currentPrice - newLevel) : (newLevel - currentPrice);
   
   if(distToCurrent < minDist) return;

   bool melhora = (dir == POSITION_TYPE_BUY) ? (currentSL == 0 || newLevel > currentSL)
                                             : (currentSL == 0 || newLevel < currentSL);
   if(!melhora) return;

   if(trade.PositionModify(ticket, newLevel, PositionGetDouble(POSITION_TP)))
     {
      if(exhaustionTriggered)
         Print("🚨 Exaustão | SL esmagado no pico! Novo Stop: ", DoubleToString(newLevel, digits));
      else
         Print("📈 Trailing (Momentum) | Novo Stop Móvel: ", DoubleToString(newLevel, digits));
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

         // Proteção de Violinada (Corta 1 ordem individualmente apenas no Lote Fixo)
         if(InpLotMode == LOT_FIXED && InpMaxSLDollars > 0 && posPnL <= -InpMaxSLDollars)
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
            ManageTrailingOne(ticket); // <-- TRAILING MÓVEL ATIVADO
            
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

      double ema21[1];
      double ema8[1];

      // Pega o valor ATUAL (índice 0) dos indicadores para não ter atraso
      if(CopyBuffer(handleEma21, 0, 0, 1, ema21) <= 0) return;
      if(CopyBuffer(handleEma8, 0, 0, 1, ema8) <= 0) return;

      string trend = "LATERAL";
      if(currentAsk > ema8[0] && ema8[0] > ema21[0]) trend = "TREND_UP";
      else if(currentBid < ema8[0] && ema8[0] < ema21[0]) trend = "TREND_DOWN";

      Print("🧠 [Sniper V2] M15 Tendência: ", trend, " | EMA8: ", DoubleToString(ema8[0], 5), " | EMA21: ", DoubleToString(ema21[0], 5));

      // Reseta variaveis globais antes de abrir nova ordem
      peakPrice = 0;
      exhaustionTriggered = false;

      double internalSLPct = 0.20; // Stop Loss Fixo inicial em 0.20%

      double slDist = currentAsk * (internalSLPct / 100.0);
      if(slDist <= minStopDist) slDist = minStopDist + (_Point * 20);

      // --- Cálculo do Lote ---
      // Forçado para 0.01 conforme solicitado para reduzir a exposição
      currentLotSize = 0.01;

      // --- Lógica a Favor da Tendência (M15) ---
      if(trend == "TREND_UP")
        {
         double buySL = currentAsk - slDist;
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, buySL, 0)) // TP = 0 (Trailing Stop vai fechar)
           {
            Print("🔥 Sinal Disparado: COMPRA (A Favor da Tendência)! Lote: ", currentLotSize);
            lastM5CandleTime = currentM15Time;
           }
         else
           {
            Print("❌ Erro ao abrir COMPRA: ", GetLastError());
           }
        }
      else if(trend == "TREND_DOWN")
        {
         double sellSL = currentBid + slDist;
         if(trade.Sell(currentLotSize, _Symbol, currentBid, sellSL, 0)) // TP = 0 (Trailing Stop vai fechar)
           {
            Print("🔥 Sinal Disparado: VENDA (A Favor da Tendência)! Lote: ", currentLotSize);
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
  }
//+------------------------------------------------------------------+