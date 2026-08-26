//+------------------------------------------------------------------+
//|                                              Fybot_API_Logic.mq5 |
//|                        Copied from DerivBotEngine.ts API logic   |
//+------------------------------------------------------------------+
#property copyright "Fybot Pro"
#property link      "https://fybot.life"
#property version   "1.00"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

input group "--- Parâmetros Principais ---"
input double   InpLotSize        = 0.01;      // Lote Inicial
input ulong    InpMagicNumber    = 123456;    // Magic Number do EA
input double   InpMaxProximity   = 2.00;      // Distância Máxima EMA 8 ($)

input group "--- Gerenciamento de Risco ---"
input double   InpSlPercent      = 0.15;      // Stop Loss Inicial (%)
input bool     InpUseTrailing    = true;      // Usar Trailing Stop
input int      InpTrailingStart  = 100;       // Iniciar Trailing (pontos)
input int      InpTrailingStep   = 50;        // Passo do Trailing (pontos)

// (Horário operacional removido a pedido do usuário)

// Objetos para trading e informações de posição
CTrade         m_trade;
CPositionInfo  m_position;

// Handles para os indicadores
int            m_handle_ema8_m15;
int            m_handle_ema21_m15;
int            m_handle_ema8_m30;
int            m_handle_ema21_m30;

// Arrays para armazenar valores dos indicadores
double         m_buffer_ema8_m15[];
double         m_buffer_ema21_m15[];
double         m_buffer_ema8_m30[];
double         m_buffer_ema21_m30[];

// Variável para controle de candles (apenas um sinal por candle)
datetime       m_last_signal_time = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   m_trade.SetExpertMagicNumber(InpMagicNumber);
   
   // Inicializa handles do M15
   m_handle_ema8_m15 = iMA(_Symbol, PERIOD_M15, 8, 0, MODE_EMA, PRICE_CLOSE);
   if(m_handle_ema8_m15 == INVALID_HANDLE) { Print("Erro ao carregar EMA 8 M15"); return INIT_FAILED; }
   
   m_handle_ema21_m15 = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   if(m_handle_ema21_m15 == INVALID_HANDLE) { Print("Erro ao carregar EMA 21 M15"); return INIT_FAILED; }
   
   // Inicializa handles do M30
   m_handle_ema8_m30 = iMA(_Symbol, PERIOD_M30, 8, 0, MODE_EMA, PRICE_CLOSE);
   if(m_handle_ema8_m30 == INVALID_HANDLE) { Print("Erro ao carregar EMA 8 M30"); return INIT_FAILED; }
   
   m_handle_ema21_m30 = iMA(_Symbol, PERIOD_M30, 21, 0, MODE_EMA, PRICE_CLOSE);
   if(m_handle_ema21_m30 == INVALID_HANDLE) { Print("Erro ao carregar EMA 21 M30"); return INIT_FAILED; }
   
   // Configura as séries
   ArraySetAsSeries(m_buffer_ema8_m15, true);
   ArraySetAsSeries(m_buffer_ema21_m15, true);
   ArraySetAsSeries(m_buffer_ema8_m30, true);
   ArraySetAsSeries(m_buffer_ema21_m30, true);

   Print("Fybot API Logic inicializado com sucesso.");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   IndicatorRelease(m_handle_ema8_m15);
   IndicatorRelease(m_handle_ema21_m15);
   IndicatorRelease(m_handle_ema8_m30);
   IndicatorRelease(m_handle_ema21_m30);
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Gerenciar posições abertas (Trailing Stop)
   ManageTrailingStop();
   
   // (Verificação de horário operacional removida a pedido do usuário)
   
   // Verifica se já operou neste candle M15
   datetime current_time = iTime(_Symbol, PERIOD_M15, 0);
   if(current_time == m_last_signal_time) return;
   
   // Só permite abrir ordens se não houver posição aberta para o magic number
   if(HasOpenPositions()) return;

   // Atualiza buffers
   if(CopyBuffer(m_handle_ema8_m15, 0, 0, 2, m_buffer_ema8_m15) <= 0) return;
   if(CopyBuffer(m_handle_ema21_m15, 0, 0, 2, m_buffer_ema21_m15) <= 0) return;
   if(CopyBuffer(m_handle_ema8_m30, 0, 0, 2, m_buffer_ema8_m30) <= 0) return;
   if(CopyBuffer(m_handle_ema21_m30, 0, 0, 2, m_buffer_ema21_m30) <= 0) return;
   
   // Extrai os valores atuais (índice 0 é a vela aberta atual, como no backend)
   double ema8M15 = m_buffer_ema8_m15[0];
   double ema21M15 = m_buffer_ema21_m15[0];
   double ema8M30 = m_buffer_ema8_m30[0];
   double ema21M30 = m_buffer_ema21_m30[0];
   
   // Determina tendência M15
   int trendM15 = 0; // 0 Lateral, 1 Alta, -1 Baixa
   if(ema8M15 > ema21M15) trendM15 = 1;
   else if(ema8M15 < ema21M15) trendM15 = -1;
   
   // Determina tendência M30
   int trendM30 = 0;
   if(ema8M30 > ema21M30) trendM30 = 1;
   else if(ema8M30 < ema21M30) trendM30 = -1;
   
   // Preço atual
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   
   // Lógica Fybot Sniper API: Pullback na EMA 8
   double distAbs = MathAbs(currentPrice - ema8M15);
   bool isNearEma8 = (distAbs <= InpMaxProximity);
   
   // SL Protetivo Inicial (ex: 0.15% do preço)
   double percDistSL = currentPrice * (InpSlPercent / 100.0);
   
   // Sinal de Compra
   if(trendM15 == 1 && trendM30 == 1 && isNearEma8)
     {
      double sl = currentPrice - percDistSL;
      if(m_trade.Buy(InpLotSize, _Symbol, 0, sl, 0, "Fybot API Buy"))
        {
         Print("COMPRA Executada! Distância Média: ", distAbs);
         m_last_signal_time = current_time;
        }
     }
   // Sinal de Venda
   else if(trendM15 == -1 && trendM30 == -1 && isNearEma8)
     {
      double sl = currentPrice + percDistSL;
      if(m_trade.Sell(InpLotSize, _Symbol, 0, sl, 0, "Fybot API Sell"))
        {
         Print("VENDA Executada! Distância Média: ", distAbs);
         m_last_signal_time = current_time;
        }
     }
  }

// (Função de horário removida)

//+------------------------------------------------------------------+
//| Função para verificar posições em aberto                         |
//+------------------------------------------------------------------+
bool HasOpenPositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(m_position.SelectByIndex(i))
        {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
            return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Função para gerenciar Trailing Stop                              |
//+------------------------------------------------------------------+
void ManageTrailingStop()
  {
   if(!InpUseTrailing) return;
   
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(m_position.SelectByIndex(i))
        {
         if(m_position.Symbol() == _Symbol && m_position.Magic() == InpMagicNumber)
           {
            double current_price = m_position.PositionType() == POSITION_TYPE_BUY ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            double open_price = m_position.PriceOpen();
            double stop_loss = m_position.StopLoss();
            
            if(m_position.PositionType() == POSITION_TYPE_BUY)
              {
               if(current_price - open_price >= InpTrailingStart * point)
                 {
                  double new_sl = current_price - (InpTrailingStep * point);
                  if(new_sl > stop_loss + (10 * point)) // Só move se for pra cima
                     m_trade.PositionModify(m_position.Ticket(), new_sl, m_position.TakeProfit());
                 }
              }
            else if(m_position.PositionType() == POSITION_TYPE_SELL)
              {
               if(open_price - current_price >= InpTrailingStart * point)
                 {
                  double new_sl = current_price + (InpTrailingStep * point);
                  if(stop_loss == 0.0 || new_sl < stop_loss - (10 * point)) // Só move se for pra baixo
                     m_trade.PositionModify(m_position.Ticket(), new_sl, m_position.TakeProfit());
                 }
              }
           }
        }
     }
  }
