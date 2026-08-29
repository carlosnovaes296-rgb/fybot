//+------------------------------------------------------------------+
//|                                           Fybot_Sniper_Free.mq5  |
//|                                           1x1 Scalper Dinâmico   |
//|                     (Versão Sem Licença / Uso Livre - v2.04)     |
//+------------------------------------------------------------------+
#property copyright "Fybot Sniper"
#property link      "https://fybot.life"
#property version   "2.04"

#include <Trade\Trade.mqh>

enum ENUM_LOT_MODE
  {
   LOT_FIXED = 0,    // Lote Fixo Travado (0.01)
   LOT_DYNAMIC = 1   // Lote Dinâmico (Risco % da Banca)
  };

input group "=== Configurações da Estratégia ==="
input ENUM_LOT_MODE      InpLotMode = LOT_DYNAMIC;   // Gerenciamento de Lote
input double             InpRiskPct = 1.0;           // Volume da Banca (%) - Se Dinâmico
input double   InpMaxSLDollars = 10.0;       // Stop Loss Máximo por Ordem ($)
input double   InpDailyTargetPct = 10.0;     // Meta Diária de Lucro (%)
input double   InpSLPercent = 30.0;          // Stop Loss (% do Preço)
input double   InpTPPercent = 10.0;          // Take Profit (% do Preço)
input ulong    InpMagicNumber = 777;         // Magic Number
input int      InpSlippage = 10;             // Slippage Máximo

input group "=== Gestão de Risco (Stop Loss ATR) ==="
input bool     InpUseAtrStop = true;         // Usar Stop Loss baseado em ATR?
input int      InpAtrPeriod = 14;            // Período do ATR
input double   InpAtrMultiplier = 2.0;       // Multiplicador do ATR (Ex: 2.0x a volatilidade)
input bool     InpManageManualOrders = true; // Gerenciar SL/TP de ordens manuais?
input bool     InpProtectManualOrders = true; // Aplicar violinada/trailing/exaustão em ordens manuais?

input group "=== Filtro de Tendência Macro ==="
input bool     InpUseEma200 = false;         // Usar Filtro EMA 200 (Tendência Longa)

input group "=== Gestão de Risco (Trailing/Exaustão) ==="
input double   InpBreakevenArmPoints = 50.0;       // Lucro (pontos) para ativar Breakeven (Antes: 50)
input double   InpBreakEvenOffsetPoints = 20.0;    // Distância do Breakeven da entrada (pontos)
input double   InpTrailingStopPoints = 50.0;       // Distância do Trailing Stop (pontos) (Antes: 100)
input double   InpTrailingStepPoints = 5.0;        // Passo do Trailing Stop (pontos)
input double   InpExhaustionVolumeDropPct = 5.0;   // Queda de Volume (%) para Exaustão
input double   InpExhaustionWickRatio = 1.0;       // Proporção do Pavio para Exaustão
input bool     InpUseExhaustionExit = true;        // Fechar posição ao detectar Exaustão?
input int      InpConsolidationLookback = 3;       // Velas para detectar Consolidação
input double   InpConsolidationRangeRatio = 1.2;   // Razão de consolidação (range)
input double   InpConsolidationEmaGapRatio = 1.0;  // Gap máximo entre EMAs na consolidação
input bool     InpUseConsolidationFilter = true;   // Bloquear entradas em zona de acumulação?

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = 0.01;
datetime       lastM5CandleTime = 0;
datetime       midnightTime = 0;
int            currentDay = -1; // usado para detectar virada de dia
datetime       cooldownEndTime = 0; // Bloqueio temporário após Stop Loss

datetime       lastLogTime = 0; // Controle de log

// Handles de Indicadores
int            handleEma21;
int            handleEma8;
int            handleEma200;
int            handleAtr;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);

   Print("✅ Fybot Sniper Free [1x1 Dinâmico] Iniciado com Sucesso!");

   UpdateMidnightTime();

   // IGUALANDO LÓGICA COM A API: EMA 21 e EMA 8 no M15
   handleEma21 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleEma8 = iMA(_Symbol, PERIOD_M15, 8, 0, MODE_EMA, PRICE_CLOSE);
   handleEma200 = iMA(_Symbol, PERIOD_M15, 200, 0, MODE_EMA, PRICE_CLOSE);
   handleAtr = iATR(_Symbol, PERIOD_M15, InpAtrPeriod);

   if(handleEma21 == INVALID_HANDLE || handleEma8 == INVALID_HANDLE || handleEma200 == INVALID_HANDLE || handleAtr == INVALID_HANDLE)
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
//| Calcula o Lucro Fechado do Dia (filtra por símbolo)              |
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
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagicNumber &&
         HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol)
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
//| Cálculo de lote dinâmico baseado em % de risco da banca          |
//| Se LOT_FIXED, mantém 0.01. Se LOT_DYNAMIC, calcula pelo risco.   |
//+------------------------------------------------------------------+
double CalculateLotSize(double slDistance)
  {
   if(InpLotMode == LOT_FIXED || slDistance <= 0)
      return 0.01;

   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount  = balance * (InpRiskPct / 100.0);

   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickValue <= 0 || tickSize <= 0)
      return 0.01;

   double lossPerLot = (slDistance / tickSize) * tickValue;
   if(lossPerLot <= 0)
      return 0.01;

   double lot = riskAmount / lossPerLot;

   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(lotStep <= 0) lotStep = minLot > 0 ? minLot : 0.01;

   lot = MathFloor(lot / lotStep) * lotStep;

   if(lot < minLot) lot = minLot;
   if(lot > maxLot) lot = maxLot;
   if(lot <= 0)      lot = minLot > 0 ? minLot : 0.01;

   return NormalizeDouble(lot, 2);
  }

//+------------------------------------------------------------------+
//| Detecta exaustão do movimento (queda de volume ou vela de       |
//| rejeição) na última vela M15 fechada, a favor da direção dir.   |
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

//+------------------------------------------------------------------+
//| Detecta zona de acumulação/consolidação (preço parado + EMAs    |
//| convergentes) para bloquear novas entradas em mercado lateral.  |
//+------------------------------------------------------------------+
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

//+------------------------------------------------------------------+
//| Gestão de Trailing/Breakeven/Exaustão de uma posição             |
//+------------------------------------------------------------------+
void ManageTrailingOne(ulong ticket)
  {
   if(!PositionSelectByTicket(ticket)) return;

   long   dir       = PositionGetInteger(POSITION_TYPE);
   double entry     = PositionGetDouble(POSITION_PRICE_OPEN);
   double currentSL = PositionGetDouble(POSITION_SL);
   double currentTP = PositionGetDouble(POSITION_TP);

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentPrice = (dir == POSITION_TYPE_BUY) ? bid : ask;

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);

   // Distância atual da entrada em pontos
   double profitPoints = (dir == POSITION_TYPE_BUY) ? (currentPrice - entry) / point : (entry - currentPrice) / point;

   // 1. Gatilho de Breakeven Clássico
   if(InpBreakevenArmPoints > 0 && profitPoints >= InpBreakevenArmPoints)
     {
      double bePrice = (dir == POSITION_TYPE_BUY) ? entry + (InpBreakEvenOffsetPoints * point) : entry - (InpBreakEvenOffsetPoints * point);

      bool canMoveToBE = (dir == POSITION_TYPE_BUY) ? (currentSL < bePrice) : (currentSL > bePrice || currentSL == 0);

      if(canMoveToBE)
        {
         if(trade.PositionModify(ticket, bePrice, currentTP))
           {
            Print("🛡️ Breakeven Ativado! Preço de proteção: ", DoubleToString(bePrice, _Digits));
            currentSL = bePrice; // Atualiza variável local para o trailing stop a seguir usar
           }
        }
     }

   // 2. Trailing Stop Clássico em Pontos
   if(InpTrailingStopPoints > 0)
     {
      double trailStopLevel = (dir == POSITION_TYPE_BUY) ? currentPrice - (InpTrailingStopPoints * point) : currentPrice + (InpTrailingStopPoints * point);

      // Verifica se precisa mover (respeitando o Step)
      bool canMoveTrailing = false;
      if(dir == POSITION_TYPE_BUY)
        {
         if(currentSL == 0 || trailStopLevel > currentSL + (InpTrailingStepPoints * point)) canMoveTrailing = true;
        }
      else
        {
         if(currentSL == 0 || trailStopLevel < currentSL - (InpTrailingStepPoints * point)) canMoveTrailing = true;
        }

      // Apenas move o SL se estivermos num lucro maior que a distancia do trailing
      if(canMoveTrailing && profitPoints >= InpTrailingStopPoints)
        {
         if(trade.PositionModify(ticket, trailStopLevel, currentTP))
           {
            Print("📈 Trailing Stop movido para: ", DoubleToString(trailStopLevel, _Digits));
           }
        }
     }

   // 3. Saída por Exaustão de Estrutura
   if(InpUseExhaustionExit && profitPoints >= InpBreakevenArmPoints && IsExhaustion(dir))
     {
      Print("🏁 Exaustão detectada na vela M15 anterior. Encerrando posição para proteger lucro.");
      trade.PositionClose(ticket);
     }
  }

//+------------------------------------------------------------------+
//| Diz se uma posição (pelo magic number) deve ser gerida pelo EA  |
//| (violinada, trailing, breakeven, exaustão). Sempre verdadeiro   |
//| para o magic do próprio EA; para ordens manuais (magic 0) só se |
//| InpManageManualOrders e InpProtectManualOrders estiverem ativos.|
//+------------------------------------------------------------------+
bool IsManagedMagic(long magic)
  {
   if(magic == (long)InpMagicNumber) return true;
   if(magic == 0 && InpManageManualOrders && InpProtectManualOrders) return true;
   return false;
  }

//+------------------------------------------------------------------+
//| Adiciona SL/TP automático em ordens abertas manualmente          |
//+------------------------------------------------------------------+
void ManageManualOrders()
  {
   if(!InpManageManualOrders) return;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      // MAGIC == 0 significa ordem aberta manualmente
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == 0)
        {
         double currentSL = PositionGetDouble(POSITION_SL);
         double currentTP = PositionGetDouble(POSITION_TP);

         // Se nao tiver SL nem TP
         if(currentSL == 0 && currentTP == 0)
           {
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            long type = PositionGetInteger(POSITION_TYPE);

            double slDist = 0;
            double tpDist = 0;

            if(InpUseAtrStop && handleAtr != INVALID_HANDLE)
              {
               double atrBuffer[1];
               if(CopyBuffer(handleAtr, 0, 0, 1, atrBuffer) > 0)
                 {
                  slDist = atrBuffer[0] * InpAtrMultiplier;
                  double tpRatio = InpTPPercent / (InpSLPercent > 0 ? InpSLPercent : 0.15);
                  tpDist = slDist * tpRatio;
                 }
              }

            if(slDist == 0)
              {
               slDist = openPrice * (InpSLPercent / 100.0);
               tpDist = openPrice * (InpTPPercent / 100.0);
              }

            double minStopDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
            double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point;
            if (spread == 0) spread = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID));
            if(minStopDist < spread * 2) minStopDist = spread * 2;

            if(slDist <= minStopDist) slDist = minStopDist + (_Point * 20);
            if(tpDist <= minStopDist) tpDist = minStopDist + (_Point * 20);

            double newSL = (type == POSITION_TYPE_BUY) ? openPrice - slDist : openPrice + slDist;
            double newTP = (type == POSITION_TYPE_BUY) ? openPrice + tpDist : openPrice - tpDist;

            if(trade.PositionModify(ticket, newSL, newTP))
              {
               Print("🛡️ SL/TP automático adicionado na ordem manual ticket: ", ticket);
              }
            else
              {
               Print("❌ Falha ao definir SL/TP automático na ordem manual ticket: ", ticket, " | Erro: ", GetLastError());
              }
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   ManageManualOrders();

   double dailyProfit = GetDailyProfit();
   double dailyTarget = initialBalance * (InpDailyTargetPct / 100.0);

   int openOrders = 0;

   double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point;
   if (spread == 0) spread = (currentAsk - currentBid);
   double minStopDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if (minStopDist < spread * 2) minStopDist = spread * 2;

   // Verifica Violinada (SL em Dólares) - aplica ao EA e, se habilitado, a ordens manuais
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      long magic = PositionGetInteger(POSITION_MAGIC);
      if(!IsManagedMagic(magic)) continue;

      double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);

      if(InpMaxSLDollars > 0 && posPnL <= -InpMaxSLDollars)
        {
         Print("🚨 [VIOLINADA] Ordem (magic ", magic, ") perdeu $", DoubleToString(-posPnL, 2), ". Fechando imediatamente!");
         trade.PositionClose(ticket);
         continue;
        }

      // O contador de ordens abertas do EA (usado para liberar novos sinais)
      // continua contando só as ordens do próprio EA, não as manuais.
      if(magic == (long)InpMagicNumber) openOrders++;
     }

   // Roda o trailing/breakeven/exaustão em toda ordem gerida (EA e, se habilitado, manuais)
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      long magic = PositionGetInteger(POSITION_MAGIC);
      if(IsManagedMagic(magic))
        {
         ManageTrailingOne(ticket);
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

      // Verifica se a última ordem fechada (deste símbolo/magic) deu prejuízo
      HistorySelect(TimeCurrent() - 3600, TimeCurrent());
      int histTotal = HistoryDealsTotal();
      for(int i = histTotal - 1; i >= 0; i--)
        {
         ulong lastTicket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(lastTicket, DEAL_MAGIC) == InpMagicNumber &&
            HistoryDealGetString(lastTicket, DEAL_SYMBOL) == _Symbol)
           {
            double lastProfit = HistoryDealGetDouble(lastTicket, DEAL_PROFIT) + HistoryDealGetDouble(lastTicket, DEAL_SWAP);
            long dealEntry = HistoryDealGetInteger(lastTicket, DEAL_ENTRY);
            if((dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT) && lastProfit < -0.1)
              {
               Print("🚨 Última ordem bateu no Stop Loss! Ativando pausa de 15 minutos de segurança...");
               cooldownEndTime = TimeCurrent() + (15 * 60); // 15 minutos
               return;
              }
            break; // achou o ultimo deal relevante deste EA/simbolo, para de procurar
           }
        }

      // Verifica se é uma nova vela de M15
      datetime currentM15Time = iTime(_Symbol, PERIOD_M15, 0);
      if(currentM15Time == lastM5CandleTime) return; // Já avaliou essa vela

      double ema21[1];
      double ema8[1];
      double ema200[1];

      if(CopyBuffer(handleEma21, 0, 0, 1, ema21) <= 0) return;
      if(CopyBuffer(handleEma8, 0, 0, 1, ema8) <= 0) return;
      if(CopyBuffer(handleEma200, 0, 0, 1, ema200) <= 0) return;

      bool macroBuyAllowed = true;
      bool macroSellAllowed = true;
      if(InpUseEma200)
        {
         macroBuyAllowed = (currentAsk > ema200[0]);
         macroSellAllowed = (currentBid < ema200[0]);
        }

      string trend = "LATERAL";
      if(currentAsk > ema8[0] && ema8[0] > ema21[0] && macroBuyAllowed) trend = "TREND_UP";
      else if(currentBid < ema8[0] && ema8[0] < ema21[0] && macroSellAllowed) trend = "TREND_DOWN";

      if(InpUseConsolidationFilter && trend != "LATERAL" && IsAccumulationZone())
        {
         Print("⚠️ Zona de acumulação/consolidação detectada. Sinal ", trend, " ignorado nesta vela.");
         trend = "LATERAL";
        }

      datetime currentM1Time = iTime(_Symbol, PERIOD_M1, 0);

      if(currentM1Time != lastLogTime)
        {
         Print("🧠 [Sniper Free V2] M15 Tendência: ", trend, " | EMA8: ", DoubleToString(ema8[0], 5), " | EMA21: ", DoubleToString(ema21[0], 5));
         lastLogTime = currentM1Time;
        }

      if(trend == "LATERAL") return; // Nada a fazer nesta vela

      double internalSLPct = InpSLPercent; // Stop Loss Fixo inicial em %
      double internalTPPct = InpTPPercent; // Take Profit Fixo em %

      double slDist = 0;
      double tpDist = 0;

      if(InpUseAtrStop)
        {
         double atrBuffer[1];
         if(CopyBuffer(handleAtr, 0, 0, 1, atrBuffer) > 0)
           {
            slDist = atrBuffer[0] * InpAtrMultiplier;
            double tpRatio = internalTPPct / (internalSLPct > 0 ? internalSLPct : 0.15);
            tpDist = slDist * tpRatio;
           }
        }

      if(slDist == 0) // Fallback ou ATR desativado
        {
         slDist = currentAsk * (internalSLPct / 100.0);
         tpDist = currentAsk * (internalTPPct / 100.0);
        }

      if(slDist <= minStopDist) slDist = minStopDist + (_Point * 20);
      if(tpDist <= minStopDist) tpDist = minStopDist + (_Point * 20);

      currentLotSize = CalculateLotSize(slDist);

      // --- Lógica a Favor da Tendência (M15) ---
      if(trend == "TREND_UP")
        {
         double buySL = currentAsk - slDist;
         double buyTP = currentAsk + tpDist;
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, buySL, buyTP))
           {
            Print("🔥 Sinal Disparado: COMPRA (A Favor da Tendência)! Lote: ", currentLotSize, " | TP: ", DoubleToString(buyTP, 5));
            lastM5CandleTime = currentM15Time; // Marca como avaliado APENAS após abrir a ordem
           }
         else
           {
            Print("❌ Erro ao abrir COMPRA: ", GetLastError());
           }
        }
      else if(trend == "TREND_DOWN")
        {
         double sellSL = currentBid + slDist;
         double sellTP = currentBid - tpDist;
         if(trade.Sell(currentLotSize, _Symbol, currentBid, sellSL, sellTP))
           {
            Print("🔥 Sinal Disparado: VENDA (A Favor da Tendência)! Lote: ", currentLotSize, " | TP: ", DoubleToString(sellTP, 5));
            lastM5CandleTime = currentM15Time; // Marca como avaliado APENAS após abrir a ordem
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
   if(handleEma21 != INVALID_HANDLE) IndicatorRelease(handleEma21);
   if(handleEma8  != INVALID_HANDLE) IndicatorRelease(handleEma8);
   if(handleEma200!= INVALID_HANDLE) IndicatorRelease(handleEma200);
   if(handleAtr   != INVALID_HANDLE) IndicatorRelease(handleAtr);
  }
//+------------------------------------------------------------------+