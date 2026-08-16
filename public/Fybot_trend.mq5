//+------------------------------------------------------------------+
//|                                                Fybot_Sniper.mq5 |
//|                     Fybot Trend - Tendencia EMA8/EMA21 + Pullback  |
//|                          (Integrado com licenciamento/webhook)   |
//+------------------------------------------------------------------+
#property copyright "Fybot Sniper"
#property link      "https://fybot.life"
#property version   "3.00"
#property strict

#include <Trade\Trade.mqh>

//====================== ENUMS =======================================
enum ENUM_LOT_MODE
  {
   LOT_FIXED   = 0,  // Lote Fixo
   LOT_DYNAMIC = 1   // Lote Dinamico (Risco % da Banca)
  };

enum EA_STATE
  {
   STATE_SEM_TENDENCIA,       // sem tendencia definida
   STATE_AGUARDANDO_ATRASO,   // tendencia detectada, contando velas de atraso (InpEntryDelayCandles)
   STATE_AGUARDANDO_PULLBACK, // a vigiar preco perto da EMA rapida para entrar
   STATE_COMPRA_ABERTA,       // todas as vagas ocupadas, direcao compra
   STATE_VENDA_ABERTA,        // todas as vagas ocupadas, direcao venda
   STATE_PROTECAO_DIARIA      // meta diaria atingida - novas entradas bloqueadas
  };

//====================== INPUTS ======================================
input group "=== Licenciamento ==="
input string   InpLicenseKey = "";                                   // Token / E-mail da Licenca Fybot
input string   InpServerUrl  = "https://fybot.life/api/mt5-webhook"; // URL do Servidor
input int      InpTimerSeconds = 5;                                  // Intervalo do timer (seg) - sync/licenca

input group "=== Estrategia AuraTrend (EMA + Pullback) ==="
input ENUM_TIMEFRAMES InpTimeframe        = PERIOD_M15; // Timeframe usado pela estrategia
input int              InpEmaFastPeriod   = 8;           // Periodo EMA rapida
input int              InpEmaSlowPeriod   = 21;          // Periodo EMA lenta
input int              InpEntryDelayCandles = 1;         // Velas de atraso apos mudanca de tendencia antes de vigiar entrada (0 = imediato)
input double            InpEma8ProximityPoints = 150.0;   // Distancia maxima (pontos) do preco a EMA rapida para considerar "pullback"
input double            InpInitialStopLossPoints = 0.0;   // SL inicial (pontos). 0 = usa a distancia minima da corretora

input group "=== Lote / Risco ==="
input ENUM_LOT_MODE    InpLotMode  = LOT_DYNAMIC; // Modo de calculo do lote
input double            InpFixedLot = 0.01;        // Lote fixo (usado quando InpLotMode = LOT_FIXED)
input double            InpRiskPct  = 1.0;         // % do saldo arriscado por operacao (usado quando InpLotMode = LOT_DYNAMIC)

input group "=== Limites e Protecoes ==="
input int      InpMaxTrades           = 1;      // Numero maximo de posicoes simultaneas geridas pelo bot
input bool     InpManageManualOrders  = true;    // Gerir tambem ordens abertas manualmente no simbolo (Magic 0)
input double   InpMaxSLDollars        = 20.0;    // Protecao de violinada - fecha a posicao se perder este valor ($). 0 = desativado
input double   InpDailyTargetPct      = 10.0;    // Meta diaria de lucro (%) - bloqueia novas entradas ao ser atingida
input ulong    InpMagicNumber         = 777;     // Magic Number
input int      InpSlippage            = 10;      // Slippage maximo (pontos)

input group "=== Trailing / Exaustao ==="
input double   InpBreakevenArmPoints      = 50.0;  // Lucro (pontos) para armar o piso de breakeven
input double   InpBreakEvenOffsetPoints   = 10.0;  // Distancia do breakeven em relacao a entrada (pontos)
input double   InpTrailMultiplier         = 1.5;   // Multiplicador do range medio para o trailing normal
input int      InpTrailLookback           = 5;     // Velas usadas para medir o range medio do trailing
input double   InpExhaustionVolumeDropPct = 30.0;  // Queda de volume (%) para considerar exaustao
input double   InpExhaustionWickRatio     = 0.5;   // Proporcao do pavio/corpo para considerar vela de rejeicao
input int      InpConsolidationLookback   = 5;     // Velas usadas para detectar zona de acumulacao
input double   InpConsolidationRangeRatio = 1.2;   // Razao (range total / range medio) para considerar preco parado
input double   InpConsolidationEmaGapRatio= 0.5;   // Gap maximo entre EMAs (relativo ao range medio) na acumulacao

//====================== GLOBAIS ======================================
CTrade   trade;

int      g_hEmaFast = INVALID_HANDLE;
int      g_hEmaSlow = INVALID_HANDLE;

int      g_trend = 0;            // 1 = alta, -1 = baixa, 0 = sem tendencia
EA_STATE g_state = STATE_SEM_TENDENCIA;
datetime g_lastBarTime = 0;
int      g_entryDelayRemaining = 0;

struct PosState
  {
   ulong  ticket;
   int    direction;          // 1 = compra, -1 = venda
   double entryPrice;
   double peakPrice;          // maior alta (compra) / menor baixa (venda) desde a entrada
   bool   exhaustionTriggered;// uma vez true, o SL passa a seguir sempre o pico
   bool   manual;             // true = ordem aberta manualmente (Magic 0), gerida pelo bot mesmo assim
  };
PosState g_positions[];

bool     g_exhaustionMode = false;  // apenas para o dashboard
string   g_lastTrigger    = "";
string   g_lastLogMsg     = "";

bool     g_isAuthorized = false;
bool     g_dailyLocked  = false;

double   g_dayStartBalance = 0;
int      currentDay        = -1;
datetime midnightTime      = 0;
datetime cooldownEndTime   = 0;

//+------------------------------------------------------------------+
//| Log / dashboard helper                                           |
//+------------------------------------------------------------------+
void LogState(string msg)
  {
   g_lastLogMsg = msg;
   Print("Fybot AuraTrend | ", msg);
  }

//+------------------------------------------------------------------+
//| Utilitarios de simbolo                                           |
//+------------------------------------------------------------------+
double PointOf(string symbol)
  {
   return SymbolInfoDouble(symbol, SYMBOL_POINT);
  }

int DigitsOf(string symbol)
  {
   return (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
  }

double GetMinStopDistance(string symbol)
  {
   double point      = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double stopLevel   = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   double spread      = SymbolInfoDouble(symbol, SYMBOL_ASK) - SymbolInfoDouble(symbol, SYMBOL_BID);
   double minDist      = MathMax(stopLevel, spread * 2.0);
   if(minDist <= 0)
      minDist = 10 * point;
   return minDist;
  }

//+------------------------------------------------------------------+
//| Indicadores: EMA rapida / EMA lenta                               |
//+------------------------------------------------------------------+
bool InitIndicators()
  {
   g_hEmaFast = iMA(_Symbol, InpTimeframe, InpEmaFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_hEmaSlow = iMA(_Symbol, InpTimeframe, InpEmaSlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
   return (g_hEmaFast != INVALID_HANDLE && g_hEmaSlow != INVALID_HANDLE);
  }

double EmaFast(int shift)
  {
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyBuffer(g_hEmaFast, 0, shift, 1, buf) > 0)
      return buf[0];
   return 0;
  }

double EmaSlow(int shift)
  {
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyBuffer(g_hEmaSlow, 0, shift, 1, buf) > 0)
      return buf[0];
   return 0;
  }

//+------------------------------------------------------------------+
//| Trend Manager                                                     |
//+------------------------------------------------------------------+
// Posicao ATUAL das EMAs (nao deteta cruzamento, so diz de que lado
// esta cada uma agora). Usado para reconhecer tendencia ja existente
// ao iniciar o EA, sem depender de um cruzamento novo.
int TrendPosition()
  {
   double fast = EmaFast(1);
   double slow = EmaSlow(1);
   if(fast == 0 || slow == 0)
      return 0;
   if(fast > slow)
      return 1;
   if(fast < slow)
      return -1;
   return 0;
  }

// Deteta um cruzamento REAL comparando duas velas fechadas (shift 2 e
// shift 1) - so conta como cruzamento se as EMAs mudaram de lado.
int DetectEmaCross()
  {
   double fast2 = EmaFast(2), slow2 = EmaSlow(2);
   double fast1 = EmaFast(1), slow1 = EmaSlow(1);
   if(fast2 == 0 || slow2 == 0 || fast1 == 0 || slow1 == 0)
      return 0;
   if(fast2 <= slow2 && fast1 > slow1)
      return 1;
   if(fast2 >= slow2 && fast1 < slow1)
      return -1;
   return 0;
  }

// Combina o cruzamento real (duas velas fechadas) com uma rede de
// seguranca: se a posicao ATUAL das EMAs ja nao bate com g_trend,
// corrige de imediato. Evita que o bot fique "preso" numa tendencia
// desatualizada.
int DetectTrendChange()
  {
   int cross = DetectEmaCross();
   if(cross != 0 && cross != g_trend)
      return cross;
   int posicaoAtual = TrendPosition();
   if(posicaoAtual != 0 && posicaoAtual != g_trend)
      return posicaoAtual;
   return 0;
  }

//+------------------------------------------------------------------+
//| Risk Manager - calculo de lote                                   |
//+------------------------------------------------------------------+
double CalcLot(double slPoints)
  {
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(InpLotMode == LOT_FIXED)
     {
      double lot = MathFloor(InpFixedLot / step) * step;
      return NormalizeDouble(MathMax(minLot, MathMin(maxLot, lot)), 2);
     }

   // Modo LOT_DYNAMIC: usa a distancia informada (slPoints) como
   // referencia de risco - no OpenTrade essa distancia e' o "alcance"
   // da tendencia (preco -> EMA lenta), nao o SL real, que fica muito
   // mais perto da entrada.
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double point     = PointOf(_Symbol);
   if(tickValue <= 0 || tickSize <= 0 || slPoints <= 0)
      return minLot;

   double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney    = balance * (InpRiskPct / 100.0);
   double moneyPerPoint= (tickValue / tickSize) * point;
   double stopMoney    = slPoints * moneyPerPoint;
   if(stopMoney <= 0)
      return minLot;

   double lot = riskMoney / stopMoney;
   lot = MathFloor(lot / step) * step;
   return NormalizeDouble(MathMax(minLot, MathMin(maxLot, lot)), 2);
  }

//+------------------------------------------------------------------+
//| Contagem de posicoes geridas pelo bot (proprias + manuais)       |
//+------------------------------------------------------------------+
int CountOpenPositions()
  {
   int count = 0;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      long magic     = PositionGetInteger(POSITION_MAGIC);
      bool isOurs    = (magic == (long)InpMagicNumber);
      bool isManual  = (magic == 0 && InpManageManualOrders);
      if(!isOurs && !isManual)
         continue;
      count++;
     }
   return count;
  }

//+------------------------------------------------------------------+
//| Trade Manager (via CTrade)                                       |
//+------------------------------------------------------------------+
bool ModifyPositionSLTP(ulong ticket, double sl, double tp)
  {
   if(!PositionSelectByTicket(ticket))
      return false;
   return trade.PositionModify(ticket, sl, tp);
  }

bool ClosePositionByTicket(ulong ticket)
  {
   if(!PositionSelectByTicket(ticket))
      return false;
   return trade.PositionClose(ticket);
  }

//+------------------------------------------------------------------+
//| Gestao do array de posicoes                                      |
//+------------------------------------------------------------------+
int FindPositionIndex(ulong ticket)
  {
   for(int i = 0; i < ArraySize(g_positions); i++)
      if(g_positions[i].ticket == ticket)
         return i;
   return -1;
  }

void RegisterPosition(ulong ticket, int dir, double entry, bool manual)
  {
   int n = ArraySize(g_positions);
   ArrayResize(g_positions, n + 1);
   g_positions[n].ticket              = ticket;
   g_positions[n].direction           = dir;
   g_positions[n].entryPrice          = entry;
   g_positions[n].peakPrice           = 0;
   g_positions[n].exhaustionTriggered = false;
   g_positions[n].manual              = manual;
  }

void RemovePositionAt(int idx)
  {
   int n = ArraySize(g_positions);
   if(idx < 0 || idx >= n)
      return;
   for(int i = idx; i < n - 1; i++)
      g_positions[i] = g_positions[i + 1];
   ArrayResize(g_positions, n - 1);
  }

// Se a ultima operacao do bot fechou com prejuizo, ativa uma pausa de
// seguranca antes de permitir novas entradas.
void CheckLastTradeForCooldown()
  {
   HistorySelect(TimeCurrent() - 3600, TimeCurrent());
   int histTotal = HistoryDealsTotal();
   if(histTotal <= 0)
      return;
   ulong lastTicket = HistoryDealGetTicket(histTotal - 1);
   if(HistoryDealGetInteger(lastTicket, DEAL_MAGIC) != (long)InpMagicNumber)
      return;
   long dealEntry = HistoryDealGetInteger(lastTicket, DEAL_ENTRY);
   double lastProfit = HistoryDealGetDouble(lastTicket, DEAL_PROFIT)
                      + HistoryDealGetDouble(lastTicket, DEAL_SWAP)
                      + HistoryDealGetDouble(lastTicket, DEAL_COMMISSION);
   if((dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT) && lastProfit < -0.1)
     {
      LogState("Ultima ordem fechou com prejuizo - pausa de seguranca de 15 minutos ativada.");
      cooldownEndTime = TimeCurrent() + (15 * 60);
     }
  }

// Sincroniza g_positions com as posicoes reais na conta (deteta
// aberturas confirmadas e fechos por SL/saida manual/etc.) e atualiza
// o estado da maquina de entrada conforme as vagas disponiveis.
void SyncPositions()
  {
   bool algumaFechou = false;

   // 1) detetar novas posicoes ainda nao registadas (do bot ou manuais)
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      long magic    = PositionGetInteger(POSITION_MAGIC);
      bool isOurs   = (magic == (long)InpMagicNumber);
      bool isManual = (magic == 0 && InpManageManualOrders);
      if(!isOurs && !isManual)
         continue;
      if(FindPositionIndex(ticket) >= 0)
         continue;
      int dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      RegisterPosition(ticket, dir, entry, isManual);
      if(isManual)
         LogState("Ordem manual detectada | Ticket " + IntegerToString((long)ticket) + " - passa a ser gerida pelo bot.");
     }

   // 2) remover posicoes ja fechadas
   for(int i = ArraySize(g_positions) - 1; i >= 0; i--)
     {
      if(!PositionSelectByTicket(g_positions[i].ticket))
        {
         RemovePositionAt(i);
         algumaFechou = true;
        }
     }
   if(algumaFechou)
     {
      LogState("Uma posicao foi encerrada - a monitorizar pullback para a proxima vaga.");
      CheckLastTradeForCooldown();
     }

   // 3) atualiza o estado da maquina de entrada conforme as vagas disponiveis
   if(g_dailyLocked)
     {
      g_state = STATE_PROTECAO_DIARIA;
      return;
     }
   if(g_trend == 0)
     {
      g_state = STATE_SEM_TENDENCIA;
      return;
     }
   int abertas = ArraySize(g_positions);
   if(abertas >= InpMaxTrades)
      g_state = (g_trend > 0) ? STATE_COMPRA_ABERTA : STATE_VENDA_ABERTA;
   else if(g_state != STATE_AGUARDANDO_ATRASO)
      g_state = STATE_AGUARDANDO_PULLBACK;
  }

//+------------------------------------------------------------------+
//| Entry Manager                                                     |
//+------------------------------------------------------------------+
void StartEntryWatch()
  {
   g_entryDelayRemaining = MathMax(0, InpEntryDelayCandles);
   if(g_entryDelayRemaining <= 0)
     {
      g_state = STATE_AGUARDANDO_PULLBACK;
      LogState("Tendencia valida - a vigiar o preco perto da EMA rapida para entrar.");
     }
   else
     {
      g_state = STATE_AGUARDANDO_ATRASO;
      LogState("Tendencia valida - aguardando " + IntegerToString(g_entryDelayRemaining) + " vela(s) antes de vigiar entradas.");
     }
  }

// A tendencia so muda com uma mudanca real detetada por DetectTrendChange.
void UpdateTrend()
  {
   int newTrendDir = DetectTrendChange();
   if(newTrendDir == 0)
      return;
   int oldTrend = g_trend;
   g_trend = newTrendDir;
   LogState(newTrendDir == 1 ? "Mudanca de tendencia detectada: ALTA." : "Mudanca de tendencia detectada: BAIXA.");

   // Tendencia inverteu com posicoes abertas na direcao antiga: encerra
   // so as do proprio bot (nunca ordens manuais).
   if(oldTrend != 0 && ArraySize(g_positions) > 0)
     {
      bool fechouAlguma = false;
      for(int i = ArraySize(g_positions) - 1; i >= 0; i--)
        {
         if(g_positions[i].manual)
            continue;
         ClosePositionByTicket(g_positions[i].ticket);
         fechouAlguma = true;
        }
      if(fechouAlguma)
        {
         LogState("Tendencia invertida - a encerrar posicoes proprias da direcao anterior.");
         SyncPositions();
        }
     }
   StartEntryWatch();
  }

// Unica condicao de entrada, valida para a 1a entrada e para
// reentradas seguintes enquanto a tendencia se mantiver: a vela
// fechada precisa estar perto da EMA rapida e do lado certo.
bool CheckEma8ProximityEntry(int dir)
  {
   double close1 = iClose(_Symbol, InpTimeframe, 1);
   double emaFast = EmaFast(1);
   if(close1 == 0 || emaFast == 0)
      return false;
   double point = PointOf(_Symbol);
   double distPts = MathAbs(close1 - emaFast) / point;
   if(distPts > InpEma8ProximityPoints)
      return false; // longe demais da EMA rapida
   if(dir > 0)
      return (close1 >= emaFast);
   return (close1 <= emaFast);
  }

void OpenTrade(int dir)
  {
   if(!g_isAuthorized)
      return;
   if(g_dailyLocked)
      return;
   if(TimeCurrent() < cooldownEndTime)
      return;
   if(CountOpenPositions() >= InpMaxTrades)
      return;

   // Guarda final: nunca abre uma ordem que contradiga a posicao REAL
   // e atual das EMAs neste instante.
   int posicaoAtual = TrendPosition();
   if(posicaoAtual == 0 || posicaoAtual != dir)
     {
      LogState("Entrada abortada - as EMAs ja nao confirmam esta direcao neste instante.");
      return;
     }

   double point  = PointOf(_Symbol);
   int    digits = DigitsOf(_Symbol);
   double price  = (dir > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // Stop loss inicial: distancia configuravel (InpInitialStopLossPoints).
   // Se 0, usa a distancia minima da corretora + folga do breakeven offset.
   double minDist     = GetMinStopDistance(_Symbol);
   double desiredDist = (InpInitialStopLossPoints > 0) ? (InpInitialStopLossPoints * point)
                                                        : (minDist + InpBreakEvenOffsetPoints * point);
   double slDist = MathMax(desiredDist, minDist);
   double sl = (dir > 0) ? NormalizeDouble(price - slDist, digits) : NormalizeDouble(price + slDist, digits);

   // Dimensionamento do lote (modo dinamico): como o SL real fica muito
   // perto da entrada, usa-se a distancia entre o preco e a EMA lenta
   // como referencia do "alcance" da tendencia nesse momento.
   double emaSlow = EmaSlow(1);
   double sizingDistPoints = (emaSlow != 0) ? MathAbs(price - emaSlow) / point : 0;
   if(sizingDistPoints < 1)
      sizingDistPoints = 50;
   double lot = CalcLot(sizingDistPoints);
   if(lot <= 0)
     {
      LogState("Lote invalido - ordem nao aberta.");
      return;
     }

   bool sent = (dir > 0) ? trade.Buy(lot, _Symbol, price, sl, 0, "FybotAuraTrend")
                         : trade.Sell(lot, _Symbol, price, sl, 0, "FybotAuraTrend");

   if(sent)
     {
      LogState((dir > 0) ? "Compra aberta." : "Venda aberta.");
      SyncPositions();
      if(CountOpenPositions() < InpMaxTrades)
         g_state = STATE_AGUARDANDO_PULLBACK; // ainda ha vagas
      else
         g_state = (dir > 0) ? STATE_COMPRA_ABERTA : STATE_VENDA_ABERTA;
     }
   else
     {
      LogState("Falha ao abrir ordem. Retcode: " + IntegerToString(trade.ResultRetcode()));
     }
  }

// Avaliado a cada vela fechada enquanto STATE_AGUARDANDO_PULLBACK.
void ProcessEntryCheck()
  {
   if(g_dailyLocked || g_trend == 0)
      return;
   if(TimeCurrent() < cooldownEndTime)
      return;
   if(CountOpenPositions() >= InpMaxTrades)
      return;
   if(CheckEma8ProximityEntry(g_trend))
     {
      g_lastTrigger = "Perto da EMA rapida";
      LogState("Preco perto da EMA rapida, a favor da tendencia - entrada.");
      OpenTrade(g_trend);
     }
  }

//+------------------------------------------------------------------+
//| Protecao diaria (meta de lucro / controle de banca)               |
//+------------------------------------------------------------------+
void UpdateMidnightTime()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(currentDay != dt.day_of_year)
     {
      currentDay = dt.day_of_year;
      g_dayStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      g_dailyLocked = false;
     }

   dt.hour = 0;
   dt.min  = 0;
   dt.sec  = 0;
   midnightTime = StructToTime(dt);
  }

double GetDailyProfit()
  {
   UpdateMidnightTime();
   HistorySelect(midnightTime, TimeCurrent());
   double totalProfit = 0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == (long)InpMagicNumber)
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

void UpdateDailyProtection()
  {
   UpdateMidnightTime();
   double dailyProfit = GetDailyProfit();
   double dailyTarget = g_dayStartBalance * (InpDailyTargetPct / 100.0);
   if(!g_dailyLocked && dailyTarget > 0 && dailyProfit >= dailyTarget)
     {
      g_dailyLocked = true;
      LogState("Meta diaria atingida ($" + DoubleToString(dailyProfit, 2) + ") - novas entradas bloqueadas ate amanha.");
     }
  }

// Protecao de violinada: fecha individualmente qualquer posicao gerida
// pelo bot que perca mais que InpMaxSLDollars.
void CheckViolinada()
  {
   if(InpMaxSLDollars <= 0)
      return;
   for(int i = ArraySize(g_positions) - 1; i >= 0; i--)
     {
      ulong ticket = g_positions[i].ticket;
      if(!PositionSelectByTicket(ticket))
         continue;
      double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      if(posPnL <= -InpMaxSLDollars)
        {
         LogState("VIOLINADA | Ticket " + IntegerToString((long)ticket) + " perdeu $" + DoubleToString(-posPnL, 2) + " - fechando imediatamente.");
         ClosePositionByTicket(ticket);
        }
     }
  }

//+------------------------------------------------------------------+
//| Trailing Manager (estrutura do mercado + deteta exaustao)        |
//+------------------------------------------------------------------+
double AverageCandleRange(int lookback)
  {
   double sum = 0;
   for(int i = 1; i <= lookback; i++)
      sum += (iHigh(_Symbol, InpTimeframe, i) - iLow(_Symbol, InpTimeframe, i));
   return (lookback > 0) ? (sum / lookback) : 0;
  }

bool IsExhaustion(int dir)
  {
   long vol1 = iVolume(_Symbol, InpTimeframe, 1);
   long vol2 = iVolume(_Symbol, InpTimeframe, 2);
   long vol3 = iVolume(_Symbol, InpTimeframe, 3);
   double avgVolPrev = (vol2 + vol3) / 2.0;

   bool volumeCaindo = false;
   if(avgVolPrev > 0)
      volumeCaindo = (vol1 < avgVolPrev * (1.0 - InpExhaustionVolumeDropPct / 100.0));

   double open1  = iOpen(_Symbol, InpTimeframe, 1);
   double close1 = iClose(_Symbol, InpTimeframe, 1);
   double high1  = iHigh(_Symbol, InpTimeframe, 1);
   double low1   = iLow(_Symbol, InpTimeframe, 1);

   double body      = MathAbs(close1 - open1);
   double upperWick = high1 - MathMax(open1, close1);
   double lowerWick = MathMin(open1, close1) - low1;

   bool velaRejeicao = false;
   if(dir > 0)
      velaRejeicao = (body > 0 && upperWick >= body * InpExhaustionWickRatio && upperWick > lowerWick);
   else
      velaRejeicao = (body > 0 && lowerWick >= body * InpExhaustionWickRatio && lowerWick > upperWick);

   return (volumeCaindo || velaRejeicao);
  }

// Zona de acumulacao: preco consolidado numa faixa estreita com as
// EMAs a convergir - tipico de topo/fundo em formacao.
bool IsAccumulationZone()
  {
   int lookback = InpConsolidationLookback;
   double highest = -1, lowest = -1;
   for(int i = 1; i <= lookback; i++)
     {
      double h = iHigh(_Symbol, InpTimeframe, i);
      double l = iLow(_Symbol, InpTimeframe, i);
      if(highest < 0 || h > highest)
         highest = h;
      if(lowest < 0 || l < lowest)
         lowest = l;
     }
   double totalRange = highest - lowest;
   double avgRange = AverageCandleRange(lookback);
   if(avgRange <= 0)
      return false;

   bool precoParado = (totalRange <= avgRange * InpConsolidationRangeRatio);

   double emaFast1 = EmaFast(1);
   double emaSlow1 = EmaSlow(1);
   if(emaFast1 == 0 || emaSlow1 == 0)
      return false;

   double gap = MathAbs(emaFast1 - emaSlow1);
   bool emasConvergentes = (gap <= avgRange * InpConsolidationEmaGapRatio);

   return (precoParado && emasConvergentes);
  }

void ManageTrailingOne(int idx)
  {
   ulong ticket = g_positions[idx].ticket;
   if(!PositionSelectByTicket(ticket))
      return;

   int    dir       = g_positions[idx].direction;
   int    digits    = DigitsOf(_Symbol);
   double point     = PointOf(_Symbol);
   double currentSL = PositionGetDouble(POSITION_SL);
   double minDist   = GetMinStopDistance(_Symbol);
   double entry     = g_positions[idx].entryPrice;

   // O pico comeca no preco de ENTRADA (nao no preco atual) - assim,
   // logo apos abrir, o "avanco favoravel" e' 0 e o trailing nao mexe
   // no SL ate' o preco realmente se mover a favor.
   if(g_positions[idx].peakPrice == 0)
      g_positions[idx].peakPrice = entry;

   double high0 = iHigh(_Symbol, InpTimeframe, 0);
   double low0  = iLow(_Symbol, InpTimeframe, 0);
   if(dir > 0 && high0 > g_positions[idx].peakPrice)
      g_positions[idx].peakPrice = high0;
   if(dir < 0 && low0 < g_positions[idx].peakPrice)
      g_positions[idx].peakPrice = low0;

   // Uma vez detectada exaustao ou zona de acumulacao, fica
   // permanentemente em modo agressivo (cola no pico).
   bool jaEstavaAtivo = g_positions[idx].exhaustionTriggered;
   bool acumulacao = IsAccumulationZone();
   if(IsExhaustion(dir) || acumulacao)
      g_positions[idx].exhaustionTriggered = true;
   g_exhaustionMode = g_positions[idx].exhaustionTriggered; // so para o dashboard

   // Na primeira vez que ativa por zona de acumulacao (nao por
   // exaustao), tenta aproximar o SL da EMA lenta imediatamente.
   if(!jaEstavaAtivo && g_positions[idx].exhaustionTriggered && acumulacao)
     {
      double emaSlow1 = EmaSlow(1);
      if(emaSlow1 != 0)
        {
         double emaSlowSL = NormalizeDouble(emaSlow1, digits);
         double bidNow = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double askNow = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double distAtual = (dir > 0) ? (bidNow - emaSlowSL) : (emaSlowSL - askNow);
         bool melhoraEma = (dir > 0) ? (currentSL == 0 || emaSlowSL > currentSL)
                                     : (currentSL == 0 || emaSlowSL < currentSL);
         if(melhoraEma && distAtual >= minDist)
           {
            if(ModifyPositionSLTP(ticket, emaSlowSL, PositionGetDouble(POSITION_TP)))
              {
               LogState("Zona de acumulacao | Ticket " + IntegerToString((long)ticket) + " - SL movido para a EMA lenta: " + DoubleToString(emaSlowSL, digits));
               currentSL = emaSlowSL;
              }
           }
        }
     }

   double avancoFavoravel = (dir > 0) ? (g_positions[idx].peakPrice - entry) : (entry - g_positions[idx].peakPrice);
   double avancoFavoravelPts = avancoFavoravel / point;

   double buffer;
   if(g_positions[idx].exhaustionTriggered)
      buffer = minDist; // modo agressivo: o mais colado possivel ao pico
   else
     {
      double avgRange = AverageCandleRange(InpTrailLookback);
      buffer = MathMax(avgRange * InpTrailMultiplier, minDist);
     }

   // Piso de breakeven: assim que o lucro atingir InpBreakevenArmPoints,
   // move o SL para a entrada + folga imediatamente.
   if(avancoFavoravelPts >= InpBreakevenArmPoints)
     {
      double beOffset = InpBreakEvenOffsetPoints * point;
      double beLevel = (dir > 0) ? NormalizeDouble(entry + beOffset, digits) : NormalizeDouble(entry - beOffset, digits);
      bool beMelhora = (dir > 0) ? (currentSL == 0 || beLevel > currentSL) : (currentSL == 0 || beLevel < currentSL);

      double bidNow = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double askNow = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double distBE = (dir > 0) ? (bidNow - beLevel) : (beLevel - askNow);

      if(beMelhora && distBE >= minDist)
        {
         if(ModifyPositionSLTP(ticket, beLevel, PositionGetDouble(POSITION_TP)))
           {
            LogState("Piso de breakeven | Ticket " + IntegerToString((long)ticket) + " - SL movido para: " + DoubleToString(beLevel, digits));
            currentSL = beLevel;
           }
        }
     }

   if(avancoFavoravel <= minDist)
      return; // ainda sem lucro real (so ruido/spread do tick de abertura)

   double newLevel = (dir > 0) ? NormalizeDouble(g_positions[idx].peakPrice - buffer, digits)
                                : NormalizeDouble(g_positions[idx].peakPrice + buffer, digits);

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentPrice = (dir > 0) ? bid : ask;
   double distToCurrent = (dir > 0) ? (currentPrice - newLevel) : (newLevel - currentPrice);
   if(distToCurrent < minDist)
      return;

   bool melhora = (dir > 0) ? (currentSL == 0 || newLevel > currentSL)
                             : (currentSL == 0 || newLevel < currentSL);
   if(!melhora)
      return;

   if(ModifyPositionSLTP(ticket, newLevel, PositionGetDouble(POSITION_TP)))
     {
      string tag = "Ticket " + IntegerToString((long)ticket);
      if(g_positions[idx].exhaustionTriggered)
         LogState("Exaustao | " + tag + " - SL colado ao pico. Novo Stop: " + DoubleToString(newLevel, digits));
      else
         LogState("Trailing (momentum) | " + tag + " - Novo Stop: " + DoubleToString(newLevel, digits));
     }
  }

void ManageTrailingAll()
  {
   for(int i = 0; i < ArraySize(g_positions); i++)
      ManageTrailingOne(i);
  }

//+------------------------------------------------------------------+
//| Licenciamento                                                     |
//+------------------------------------------------------------------+
void ValidateLicense()
  {
   if(InpLicenseKey == "")
     {
      g_isAuthorized = false;
      LogState("Licenca vazia - robo bloqueado para novas entradas.");
      return;
     }
   // A validacao remota efetiva ocorre via webhook (SyncWithServer);
   // aqui garante-se apenas que a chave foi informada localmente.
   g_isAuthorized = true;
  }

//+------------------------------------------------------------------+
//| Relatorio / Dashboard                                             |
//+------------------------------------------------------------------+
void ReportBalance()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyProfit = GetDailyProfit();
   Print("Saldo: $", DoubleToString(balance, 2), " | Equity: $", DoubleToString(equity, 2), " | Lucro do dia: $", DoubleToString(dailyProfit, 2));
  }

string StateToString(EA_STATE st)
  {
   switch(st)
     {
      case STATE_SEM_TENDENCIA:       return "SEM TENDENCIA";
      case STATE_AGUARDANDO_ATRASO:   return "AGUARDANDO ATRASO";
      case STATE_AGUARDANDO_PULLBACK: return "AGUARDANDO PULLBACK";
      case STATE_COMPRA_ABERTA:       return "COMPRA ABERTA";
      case STATE_VENDA_ABERTA:        return "VENDA ABERTA";
      case STATE_PROTECAO_DIARIA:     return "PROTECAO DIARIA ATIVA";
     }
   return "-";
  }

void UpdateDashboard()
  {
   string trendStr = (g_trend > 0) ? "ALTA" : (g_trend < 0) ? "BAIXA" : "LATERAL";
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyProfit = GetDailyProfit();

   string panel = "===== FYBOT SNIPER - AURATREND =====\n";
   panel += "Simbolo: " + _Symbol + " | TF: " + EnumToString(InpTimeframe) + "\n";
   panel += "Licenca: " + (g_isAuthorized ? "OK" : "BLOQUEADA") + "\n";
   panel += "Tendencia: " + trendStr + " | Estado: " + StateToString(g_state) + "\n";
   panel += "Posicoes: " + IntegerToString(ArraySize(g_positions)) + "/" + IntegerToString(InpMaxTrades) + "\n";
   panel += "Saldo: $" + DoubleToString(balance, 2) + " | Equity: $" + DoubleToString(equity, 2) + "\n";
   panel += "Lucro do dia: $" + DoubleToString(dailyProfit, 2) + " | Meta: " + DoubleToString(InpDailyTargetPct, 1) + "%\n";
   panel += "Ultimo evento: " + g_lastLogMsg;
   Comment(panel);
  }

//+------------------------------------------------------------------+
//| Sincronizacao com o Dashboard via Webhook                        |
//+------------------------------------------------------------------+
void SyncWithServer()
  {
   if(InpServerUrl == "" || InpLicenseKey == "")
      return;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double daily_profit = GetDailyProfit();

   int open_orders = 0;
   string trades_json = "[";

   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetInteger(POSITION_MAGIC) == (long)InpMagicNumber)
        {
         if(open_orders > 0)
            trades_json += ",";

         double profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
         double volume = PositionGetDouble(POSITION_VOLUME);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         string symbol = PositionGetString(POSITION_SYMBOL);
         long   type_int = PositionGetInteger(POSITION_TYPE);
         string type_str = (type_int == POSITION_TYPE_BUY) ? "buy" : "sell";

         trades_json += "{";
         trades_json += "\"id\":\"" + IntegerToString((long)ticket) + "\",";
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

   // Ultimos 10 negocios fechados hoje
   HistorySelect(midnightTime, TimeCurrent());
   int histTotal = HistoryDealsTotal();
   string closed_json = "[";
   int closed_count = 0;

   for(int i = histTotal - 1; i >= 0 && closed_count < 10; i--)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == (long)InpMagicNumber)
        {
         long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
           {
            if(closed_count > 0)
               closed_json += ",";

            double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT) + HistoryDealGetDouble(ticket, DEAL_SWAP) + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
            double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
            double price  = HistoryDealGetDouble(ticket, DEAL_PRICE);
            string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
            long pos_id   = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

            long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
            string type_str = (dealType == DEAL_TYPE_BUY) ? "sell" : "buy"; // reverte para mostrar o tipo original da posicao

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
   json += "\"trend\":" + IntegerToString(g_trend) + ",";
   json += "\"state\":\"" + StateToString(g_state) + "\",";
   json += "\"trades\":" + trades_json + ",";
   json += "\"closed_trades\":" + closed_json;
   json += "}";

   char post[], result[];
   string result_headers;
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1); // remove o \0 do final da string

   WebRequest("POST", InpServerUrl, headers, 5000, post, result, result_headers);
  }

//+------------------------------------------------------------------+
//| Eventos do EA                                                     |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(InpLicenseKey == "")
     {
      Print("ERRO: Chave de Licenca nao informada! O robo nao pode ser iniciado.");
      return(INIT_FAILED);
     }
   if(InpMaxTrades < 1)
     {
      Print("ERRO: InpMaxTrades precisa ser >= 1.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   if(InpEmaFastPeriod <= 0 || InpEmaSlowPeriod <= 0 || InpEmaFastPeriod >= InpEmaSlowPeriod)
     {
      Print("ERRO: verifique os periodos das EMAs (rapida deve ser menor que a lenta).");
      return(INIT_PARAMETERS_INCORRECT);
     }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFillingBySymbol(_Symbol); // deteta automaticamente o modo de preenchimento suportado pela corretora
   trade.SetAsyncMode(false);

   if(!InitIndicators())
     {
      Print("Erro ao criar os handles das EMAs.");
      return(INIT_FAILED);
     }

   currentDay = -1;
   UpdateMidnightTime(); // ja define g_dayStartBalance para o dia atual

   ValidateLicense();

   // Reconhece a tendencia ATUAL das EMAs mesmo sem um cruzamento novo
   // (nao fica parado a espera de um cruzamento fresco ao iniciar).
   g_trend = TrendPosition();
   SyncPositions(); // com g_trend ja definido, ajusta o estado conforme posicoes existentes
   if(g_trend != 0 && ArraySize(g_positions) == 0)
     {
      LogState("Tendencia atual reconhecida ao iniciar: " + (g_trend > 0 ? "ALTA" : "BAIXA"));
      StartEntryWatch();
     }

   EventSetTimer(MathMax(1, InpTimerSeconds));

   Print("Fybot Sniper AuraTrend iniciado | ", _Symbol, " | Timeframe: ", EnumToString(InpTimeframe),
         " | EMA ", InpEmaFastPeriod, "/", InpEmaSlowPeriod);
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(g_hEmaFast != INVALID_HANDLE)
      IndicatorRelease(g_hEmaFast);
   if(g_hEmaSlow != INVALID_HANDLE)
      IndicatorRelease(g_hEmaSlow);
   Comment("");
  }

void OnNewBar()
  {
   UpdateTrend(); // deteta mudanca de tendencia; pode chamar StartEntryWatch()

   if(g_state == STATE_AGUARDANDO_ATRASO)
     {
      g_entryDelayRemaining--;
      if(g_entryDelayRemaining <= 0)
        {
         g_state = STATE_AGUARDANDO_PULLBACK;
         LogState("Atraso concluido - a vigiar o preco perto da EMA rapida para entrar.");
        }
     }
   else if(g_state == STATE_AGUARDANDO_PULLBACK)
     {
      ProcessEntryCheck(); // condicao unica: preco perto da EMA rapida, a favor da tendencia
     }
  }

void OnTick()
  {
   CheckViolinada();  // protecao de violinada avaliada a cada tick, antes do trailing
   SyncPositions();
   ManageTrailingAll(); // segue o pico - avaliado a cada tick (fiavel no Strategy Tester)

   datetime barTime = iTime(_Symbol, InpTimeframe, 0);
   if(barTime != g_lastBarTime)
     {
      g_lastBarTime = barTime;
      OnNewBar();
     }
  }

void OnTimer()
  {
   ValidateLicense();
   UpdateDailyProtection();
   SyncPositions();

   static datetime lastReport = 0;
   if(TimeCurrent() - lastReport >= 10)
     {
      ReportBalance();
      lastReport = TimeCurrent();
     }

   UpdateDashboard();
   SyncWithServer();
  }
//+------------------------------------------------------------------+
