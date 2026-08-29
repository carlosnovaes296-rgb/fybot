//+------------------------------------------------------------------+
//|                                                Fybot_Sniper.mq5 |
//|                                           1x1 Scalper Dinâmico   |
//|                                  (Versão corrigida - v2.05)      |
//|                                                                    |
//| CORREÇÕES NESTA VERSÃO (em relação à v2.02 com validação):       |
//| 1) Validação de licença em OnInit() era "fail-open": só          |
//|    bloqueava em 404/400/403 e tratava QUALQUER outro código      |
//|    (500, 401, 429, etc.) como licença válida -> corrigido para   |
//|    fail-closed (só 200 é aceito como válido).                    |
//|    ATENÇÃO: essa validação usa o MESMO endpoint (InpServerUrl)   |
//|    do webhook de telemetria (SyncWithServer). Confirme com o     |
//|    backend se essa rota realmente valida a licença ou só recebe  |
//|    dados - senão a checagem pode sempre "passar" na prática.     |
//| 2) ManageTrailingOne() não validava a distância mínima de stop   |
//|    da corretora (SYMBOL_TRADE_STOPS_LEVEL) -> PositionModify     |
//|    podia falhar silenciosamente perto do preço. Adicionado.      |
//| 3) IsExhaustion() estava implementada mas nunca era chamada ->   |
//|    agora fecha a posição lucrativa cedo ao detectar exaustão.    |
//| 4) IsAccumulationZone() estava implementada mas nunca era        |
//|    chamada -> agora bloqueia novas entradas em lateralização.    |
//| 5) Loop de trailing usava índice crescente; agora decrescente    |
//|    (defensivo, já que o item 3 pode fechar posições no loop).    |
//| 6) Variável não usada exhaustionTriggered removida.              |
//| 7) lastM5CandleTime renomeada para lastM15CandleTime (o EA       |
//|    sempre operou em M15).                                        |
//|                                                                    |
//| v2.05: adicionada checagem do CORPO da resposta de validação de  |
//| licença (campo "valid"), como segunda trava além do código HTTP, |
//| já que o endpoint usado pode não ser uma rota de validação real. |
//+------------------------------------------------------------------+
#property copyright "Fybot Sniper"
#property link      "https://fybot.life"
#property version   "2.05"

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

input group "=== Filtro de Tendência Macro ==="
input bool     InpUseEma200 = false;         // Usar Filtro EMA 200 (Tendência Longa)

input group "=== Gestão de Risco (Trailing/Exaustão) ==="
input double   InpBreakevenArmPoints = 50.0;       // Lucro (pontos) para ativar Breakeven (Antes: 50)
input double   InpBreakEvenOffsetPoints = 20.0;    // Distância do Breakeven da entrada (pontos)
input double   InpTrailingStopPoints = 50.0;       // Distância do Trailing Stop (pontos) (Antes: 100)
input double   InpTrailingStepPoints = 5.0;        // Passo do Trailing Stop (pontos)
input double   InpExhaustionVolumeDropPct = 5.0;   // Queda de Volume (%) para Exaustão
input double   InpExhaustionWickRatio = 1.0;       // Proporção do Pavio para Exaustão
input int      InpConsolidationLookback = 3;       // Velas para detectar Consolidação
input double   InpConsolidationRangeRatio = 1.2;   // Razão de consolidação (range)
input double   InpConsolidationEmaGapRatio = 1.0;  // Gap máximo entre EMAs na consolidação

CTrade         trade;
double         initialBalance = 0;
double         currentLotSize = 0.01;
datetime       lastM15CandleTime = 0;
datetime       midnightTime = 0;
int            currentDay = -1; // usado para detectar virada de dia
datetime       cooldownEndTime = 0; // Bloqueio temporário após Stop Loss

double         peakPrice = 0;
datetime       lastLogTime = 0; // Added for log control

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
   if(InpLicenseKey == "")
     {
      Print("❌ ERRO: Chave de Licença não informada! O robô não pode ser iniciado.");
      return(INIT_FAILED);
     }

   // --- Validação da Licença no Servidor ---
   // FIX: agora é fail-closed - só o código HTTP 200 é aceito como válido.
   // Antes, qualquer código fora de {404,400,403,-1} (ex.: 500, 401, 429)
   // era tratado como licença válida, o que é perigoso para um gate de licença.
   Print("🔄 Validando licença no servidor...");
   string json_auth = "{\"license\":\"" + InpLicenseKey + "\"}";
   char post_auth[], result_auth[];
   string result_headers_auth;
   string headers_auth = "Content-Type: application/json\r\n";
   StringToCharArray(json_auth, post_auth, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post_auth, ArraySize(post_auth) - 1);

   int res_auth = WebRequest("POST", InpServerUrl, headers_auth, 5000, post_auth, result_auth, result_headers_auth);

   if(res_auth == -1)
     {
      Print("⚠️ AVISO: Falha de comunicação com o servidor de licenças. Verifique se a URL está na lista Permitida (Ferramentas > Opções > Expert Advisors). Erro: ", GetLastError());
      return(INIT_FAILED);
     }
   else if(res_auth != 200)
     {
      Print("❌ ERRO: Licença Inválida ou Expirada! O robô será bloqueado. (Code: ", res_auth, ")");
      return(INIT_FAILED);
     }

   // FIX: segunda trava, checando o CORPO da resposta, não só o status HTTP.
   // Se o endpoint sempre responde 200 (por ser um webhook genérico de telemetria
   // e não uma rota de validação de verdade), o código HTTP sozinho nunca vai
   // bloquear ninguém. Se o servidor devolver um campo "valid" no JSON, ele é
   // respeitado aqui. Se o corpo não tiver esse campo (endpoint ainda não
   // devolve isso), o EA cai no comportamento antigo (aceita no 200) para não
   // quebrar quem já está rodando - mas o ideal é o backend passar a responder
   // com "valid":true/false explicitamente (ver passo 3 da explicação).
   string bodyAuth = CharArrayToString(result_auth, 0, WHOLE_ARRAY, CP_UTF8);
   StringToLower(bodyAuth);
   if(StringFind(bodyAuth, "\"valid\"") >= 0 && StringFind(bodyAuth, "\"valid\":true") < 0 && StringFind(bodyAuth, "\"valid\": true") < 0)
     {
      Print("❌ ERRO: Servidor respondeu 200, mas o corpo indica licença inválida: ", bodyAuth);
      return(INIT_FAILED);
     }

   Print("✅ Licença Validada com Sucesso!");
   // ----------------------------------------

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);

   EventSetTimer(5); // Inicia o timer para sincronizar com o site a cada 5 segundos

   Print("✅ Fybot Sniper [1x1 Dinâmico] Iniciado com Sucesso!");

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
//| Calcula o Lucro Fechado do Dia (FIX: agora filtra por símbolo)   |
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
//| FIX: Cálculo de lote dinâmico baseado em % de risco da banca     |
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

//+------------------------------------------------------------------+
//| Gerencia breakeven, trailing clássico em pontos e saída por      |
//| exaustão de uma posição.                                         |
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

   // FIX: distância mínima de stop exigida pela corretora - antes não era
   // verificada, então o PositionModify podia falhar silenciosamente perto do preço.
   double minStopDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   double spread = (ask - bid);
   if(minStopDist < spread * 2) minStopDist = spread * 2;

   // Distância atual da entrada em pontos
   double profitPoints = (dir == POSITION_TYPE_BUY) ? (currentPrice - entry) / point : (entry - currentPrice) / point;

   // 1. Gatilho de Breakeven Clássico
   if(InpBreakevenArmPoints > 0 && profitPoints >= InpBreakevenArmPoints)
     {
      double bePrice = (dir == POSITION_TYPE_BUY) ? entry + (InpBreakEvenOffsetPoints * point) : entry - (InpBreakEvenOffsetPoints * point);

      bool canMoveToBE = (dir == POSITION_TYPE_BUY) ? (currentSL < bePrice) : (currentSL > bePrice || currentSL == 0);

      if(canMoveToBE && MathAbs(currentPrice - bePrice) >= minStopDist)
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
      // e se a nova distância respeitar o mínimo exigido pela corretora
      if(canMoveTrailing && profitPoints >= InpTrailingStopPoints && MathAbs(currentPrice - trailStopLevel) >= minStopDist)
        {
         if(trade.PositionModify(ticket, trailStopLevel, currentTP))
           {
            Print("📈 Trailing Stop movido para: ", DoubleToString(trailStopLevel, _Digits));
            currentSL = trailStopLevel;
           }
        }
     }

   // 3. FIX: IsExhaustion() estava implementada mas nunca era chamada.
   // Se a posição está no lucro e aparecem sinais de exaustão de tendência
   // (queda de volume ou vela de rejeição), realiza o lucro antecipadamente.
   double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
   if(posPnL > 0 && IsExhaustion(dir))
     {
      Print("🔚 [Exaustão] Sinal de exaustão detectado com lucro de $", DoubleToString(posPnL, 2), " - encerrando posição.");
      trade.PositionClose(ticket);
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

   double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point;
   if (spread == 0) spread = (currentAsk - currentBid);
   double minStopDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if (minStopDist < spread * 2) minStopDist = spread * 2;

   // Verifica Violinada (SL em Dólares) e calcula o estado atual
   // FIX: protecao agora vale para os dois modos de lote, nao so LOT_FIXED
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         double posPnL = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);

         if(InpMaxSLDollars > 0 && posPnL <= -InpMaxSLDollars)
           {
            Print("🚨 [VIOLINADA] Ordem perdeu $", DoubleToString(-posPnL, 2), ". Fechando imediatamente!");
            trade.PositionClose(ticket);
            continue;
           }

         openOrders++;
        }
     }

   // Roda o trailing/breakeven/exaustão em toda ordem aberta deste EA
   // FIX: loop agora é decrescente para não pular posições que sejam
   // fechadas dentro de ManageTrailingOne (ex.: fechamento por exaustão).
   if(openOrders > 0)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong ticket = PositionGetTicket(i);
         if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
           {
            ManageTrailingOne(ticket);
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
      if(currentM15Time == lastM15CandleTime) return; // Já avaliou essa vela

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

      // FIX: IsAccumulationZone() estava implementada mas nunca era chamada.
      // Agora é usada para evitar falsos rompimentos durante lateralização.
      bool emConsolidacao = IsAccumulationZone();

      datetime currentM1Time = iTime(_Symbol, PERIOD_M1, 0);

      if(currentM1Time != lastLogTime)
        {
         Print("🧠 [Sniper V2] M15 Tendência: ", trend,
               " | EMA8: ", DoubleToString(ema8[0], 5),
               " | EMA21: ", DoubleToString(ema21[0], 5),
               " | Consolidação: ", (emConsolidacao ? "SIM (entradas bloqueadas)" : "não"));
         lastLogTime = currentM1Time;
        }

      if(emConsolidacao) return; // aguarda o mercado sair da lateralização

      // A marcação da vela será feita apenas se abrir a ordem com sucesso.

      // Reseta variaveis globais antes de abrir nova ordem
      peakPrice = 0;

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
            // Se InpSLPercent = 0.15 e InpTPPercent = 0.30, a proporção é 2.0x
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

      // FIX: lote agora respeita InpLotMode (fixo 0.01 ou dinamico por risco %)
      currentLotSize = CalculateLotSize(slDist);

      // --- Lógica a Favor da Tendência (M15) ---
      if(trend == "TREND_UP")
        {
         double buySL = currentAsk - slDist;
         double buyTP = currentAsk + tpDist;
         if(trade.Buy(currentLotSize, _Symbol, currentAsk, buySL, buyTP))
           {
            Print("🔥 Sinal Disparado: COMPRA (A Favor da Tendência)! Lote: ", currentLotSize, " | TP: ", DoubleToString(buyTP, 5));
            lastM15CandleTime = currentM15Time; // Marca como avaliado APENAS após abrir a ordem
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
            lastM15CandleTime = currentM15Time; // Marca como avaliado APENAS após abrir a ordem
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

   // FIX: libera os handles dos indicadores (evita vazamento de recursos)
   if(handleEma21 != INVALID_HANDLE) IndicatorRelease(handleEma21);
   if(handleEma8  != INVALID_HANDLE) IndicatorRelease(handleEma8);
   if(handleEma200!= INVALID_HANDLE) IndicatorRelease(handleEma200);
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

   // Captura os ultimos 10 trades fechados hoje
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
   if(res == -1)
     {
      Print("⚠️ Falha ao sincronizar com o servidor. Erro: ", GetLastError(),
            " - verifique se a URL está na lista de URLs permitidas (Ferramentas > Opções > Expert Advisors).");
     }
  }
//+------------------------------------------------------------------+