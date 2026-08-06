//+------------------------------------------------------------------+
//|                                                     fybot.mq5    |
//|  EA com DCA SEM MARTINGALE (lote nunca aumenta, so diminui)      |
//|  Sinal de tendencia: mercado sobe -> compra | mercado cai -> venda|
//|  Stop Loss obrigatorio + anti-violinada (-20% backstop)          |
//|  Meta diaria de lucro + trava de perda diaria                    |
//|  Reducao de lote apos perdas seguidas + filtro de horario        |
//+------------------------------------------------------------------+
#property copyright "fybot"
#property version   "3.00"
#property strict

#include <Trade\Trade.mqh>
CTrade trade;

//====================== INPUTS ======================================
input group "=== Geral ==="
input long   InpMagicNumber          = 202608;   // Magic Number
input double InpLotSize              = 0.01;     // Lote BASE (nunca aumenta - so pode ser reduzido apos perdas)
input bool   InpPermitirCompras      = true;     // Permitir sequencia de COMPRA
input bool   InpPermitirVendas       = true;     // Permitir sequencia de VENDA

input group "=== Filtro de Horario (evita operar fora do horario forte do ouro) ==="
input bool   InpUsarFiltroHorario    = true;     // Ativar filtro de horario
input int    InpHoraInicio           = 8;        // Hora inicio (horario do servidor/broker)
input int    InpHoraFim              = 20;       // Hora fim (horario do servidor/broker)

input group "=== Sinal de Entrada (Ordem 1) - Tendencia ==="
input int    InpSinalLookback          = 5;      // Barras atras para medir a direcao do mercado
input double InpSinalMovimentoMinimo   = 0.03;   // Variacao minima (%) para considerar tendencia valida

input group "=== DCA (sem martingale) ==="
input int    InpMaxOrdensTotal       = 6;        // Maximo ABSOLUTO de ordens (compra + venda somadas)

input double InpTP_Ordem1            = 0.04;     // TP da Ordem 1 (%)
input double InpTP_Ordem2            = 0.05;     // TP da Ordem 2 (%)
input double InpTP_Ordem3            = 0.08;     // TP da Ordem 3 (%)
input double InpTP_Ordem4            = 0.13;     // TP da Ordem 4 (%) - CORRIGIDO (era 0.013)
input double InpTP_Ordem5            = 0.18;     // TP da Ordem 5 (%)
input double InpTP_Ordem6            = 0.22;     // TP da Ordem 6 (%)

input double InpRecuo_Ordem2         = 0.06;     // Recuo negativo (%) que dispara a Ordem 2
input double InpRecuo_Ordem3         = 0.10;     // Recuo negativo (%) que dispara a Ordem 3
input double InpRecuo_Ordem4         = 0.15;     // Recuo negativo (%) que dispara a Ordem 4
input double InpRecuo_Ordem5         = 0.20;     // Recuo negativo (%) que dispara a Ordem 5
input double InpRecuo_Ordem6         = 0.25;     // Recuo negativo (%) que dispara a Ordem 6

input group "=== Stop Loss obrigatorio (protecao real - NAO deixa 'correr solto') ==="
input double InpSL_Percent           = 0.50;     // SL de cada ordem, em % sobre o preco de abertura

input group "=== Reducao de Lote apos perdas seguidas (anti-martingale) ==="
input bool   InpReduzirLoteAposPerdas    = true; // Ativar reducao de lote apos perdas
input int    InpPerdasConsecutivasReduz  = 2;    // Nº de perdas seguidas para reduzir o lote
input double InpFatorReducaoLote         = 0.5;  // Fator multiplicador do lote a cada reducao (0.5 = metade)
input double InpLoteMinimo               = 0.01; // Lote minimo permitido

input group "=== Seguranca Anti-Violinada (backstop de emergencia) ==="
input double InpViolinadaPercent     = 20.0;     // Fecha a ordem imediatamente se mover -20% contra (alta ou baixa) - CORRIGIDO

input group "=== Meta e Trava Diaria ==="
input double InpMetaDiariaPercent    = 3.0;      // Meta diaria de lucro (% sobre a banca) - para novas ordens
input double InpPerdaDiariaMaxPercent = 2.0;     // Trava de perda diaria (% sobre a banca) - para novas ordens
input double InpProtecaoFlutuantePercent = 5.0;  // Fecha tudo se prejuizo flutuante = 5% do lucro do dia (apos bater meta)

//====================== VARIAVEIS GLOBAIS ============================
double NiveisRecuoPercent[6];
double TPNiveisPercent[6];

bool   buyLevelAberto[6];
bool   sellLevelAberto[6];
double buyRefPrice  = 0.0;
double sellRefPrice = 0.0;

datetime diaAtual = 0;
double   bancaInicioDia = 0.0;
bool     pararNovasOrdens = false; // true = meta batida OU trava de perda acionada

//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(30);

   NiveisRecuoPercent[0] = 0.0;
   NiveisRecuoPercent[1] = InpRecuo_Ordem2;
   NiveisRecuoPercent[2] = InpRecuo_Ordem3;
   NiveisRecuoPercent[3] = InpRecuo_Ordem4;
   NiveisRecuoPercent[4] = InpRecuo_Ordem5;
   NiveisRecuoPercent[5] = InpRecuo_Ordem6;

   TPNiveisPercent[0] = InpTP_Ordem1;
   TPNiveisPercent[1] = InpTP_Ordem2;
   TPNiveisPercent[2] = InpTP_Ordem3;
   TPNiveisPercent[3] = InpTP_Ordem4;
   TPNiveisPercent[4] = InpTP_Ordem5;
   TPNiveisPercent[5] = InpTP_Ordem6;

   ResetControleDCA();
   PrepararNovoDia(true);

   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {}
//+------------------------------------------------------------------+
void OnTick()
  {
   VerificarNovoDia();

   // 1) Backstop de emergencia (independe de horario ou meta)
   VerificarViolinada();

   // 2) Meta de lucro / trava de perda diaria
   VerificarMetaETravaDiaria();

   if(pararNovasOrdens)
      return; // nao abre mais nada, so deixa SL/TP/violinada administrarem o que ja esta aberto

   // 3) Filtro de horario - bloqueia apenas ABERTURA de novas ordens
   if(InpUsarFiltroHorario && !DentroDoHorarioPermitido())
      return;

   // 4) Logica de entrada (Ordem 1) e DCA (Ordens 2 a 6)
   if(InpPermitirCompras)
      GerenciarDirecao(true);

   if(InpPermitirVendas)
      GerenciarDirecao(false);
  }

//+------------------------------------------------------------------+
bool DentroDoHorarioPermitido()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int hora = dt.hour;

   if(InpHoraInicio <= InpHoraFim)
      return (hora >= InpHoraInicio && hora < InpHoraFim);
   else
      return (hora >= InpHoraInicio || hora < InpHoraFim); // range que cruza a meia-noite
  }

//+------------------------------------------------------------------+
void ResetControleDCA()
  {
   for(int i=0;i<6;i++)
     {
      buyLevelAberto[i]  = false;
      sellLevelAberto[i] = false;
     }
   buyRefPrice  = 0.0;
   sellRefPrice = 0.0;
  }

//+------------------------------------------------------------------+
void VerificarNovoDia()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   datetime hoje = StructToTime(dt);

   if(hoje != diaAtual)
      PrepararNovoDia(false);
  }

void PrepararNovoDia(bool primeiraExecucao)
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   diaAtual = StructToTime(dt);

   bancaInicioDia   = AccountInfoDouble(ACCOUNT_BALANCE);
   pararNovasOrdens = false;

   if(ContarPosicoes(true)==0 && ContarPosicoes(false)==0)
      ResetControleDCA();

   if(!primeiraExecucao)
      Print("Novo dia detectado. Banca inicial: ", bancaInicioDia);
  }

//+------------------------------------------------------------------+
int ContarPosicoes(bool ehCompra)
  {
   int total=0;
   for(int i=PositionsTotal()-1; i>=0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;

      long tipo = PositionGetInteger(POSITION_TYPE);
      if(ehCompra && tipo==POSITION_TYPE_BUY) total++;
      if(!ehCompra && tipo==POSITION_TYPE_SELL) total++;
     }
   return total;
  }

int ContarTotalPosicoes()
  {
   return ContarPosicoes(true) + ContarPosicoes(false);
  }

//+------------------------------------------------------------------+
double SomaPrejuizoFlutuante()
  {
   double soma=0.0;
   for(int i=PositionsTotal()-1; i>=0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;

      double lucro = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      if(lucro<0)
         soma += lucro;
     }
   return soma;
  }

//+------------------------------------------------------------------+
double LucroRealizadoDoDia()
  {
   double soma=0.0;
   if(!HistorySelect(diaAtual, TimeCurrent()))
      return 0.0;

   int total = HistoryDealsTotal();
   for(int i=0;i<total;i++)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket==0) continue;
      if(HistoryDealGetString(dealTicket, DEAL_SYMBOL)!=_Symbol) continue;
      if(HistoryDealGetInteger(dealTicket, DEAL_MAGIC)!=InpMagicNumber) continue;

      soma += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      soma += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      soma += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
     }
   return soma;
  }

//+------------------------------------------------------------------+
//| Conta quantas operacoes SEGUIDAS deram perda (olhando o historico  |
//| de saidas mais recentes ate encontrar uma vitoria ou empate)       |
//+------------------------------------------------------------------+
int ContarPerdasConsecutivas()
  {
   if(!HistorySelect(0, TimeCurrent()))
      return 0;

   int total = HistoryDealsTotal();
   int perdas = 0;

   for(int i=total-1; i>=0; i--)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket==0) continue;
      if(HistoryDealGetString(dealTicket, DEAL_SYMBOL)!=_Symbol) continue;
      if(HistoryDealGetInteger(dealTicket, DEAL_MAGIC)!=InpMagicNumber) continue;
      if(HistoryDealGetInteger(dealTicket, DEAL_ENTRY)!=DEAL_ENTRY_OUT) continue; // so conta fechamentos

      double resultado = HistoryDealGetDouble(dealTicket, DEAL_PROFIT)
                        + HistoryDealGetDouble(dealTicket, DEAL_SWAP)
                        + HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);

      if(resultado < 0)
         perdas++;
      else
         break; // achou vitoria/empate, para de contar
     }
   return perdas;
  }

//+------------------------------------------------------------------+
//| Calcula o lote atual: nunca maior que InpLotSize, so pode reduzir  |
//| apos sequencias de perdas (o OPOSTO do martingale)                 |
//+------------------------------------------------------------------+
double CalcularLoteAtual()
  {
   double lote = InpLotSize;

   if(InpReduzirLoteAposPerdas && InpPerdasConsecutivasReduz>0)
     {
      int perdas = ContarPerdasConsecutivas();
      int passos = perdas / InpPerdasConsecutivasReduz;
      if(passos>0)
         lote = InpLotSize * MathPow(InpFatorReducaoLote, passos);
     }

   if(lote < InpLoteMinimo)
      lote = InpLoteMinimo;

   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(step>0)
      lote = MathFloor(lote/step) * step;

   double loteMinBroker = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(lote < loteMinBroker)
      lote = loteMinBroker;

   return NormalizeDouble(lote, 2);
  }

//+------------------------------------------------------------------+
//| Backstop de emergencia: fecha na hora se mover -10% contra,       |
//| mesmo que o SL normal falhe (gap, slippage, erro de execucao)     |
//+------------------------------------------------------------------+
void VerificarViolinada()
  {
   for(int i=PositionsTotal()-1; i>=0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;

      long   tipo      = PositionGetInteger(POSITION_TYPE);
      double abertura   = PositionGetDouble(POSITION_PRICE_OPEN);
      double precoAtual = (tipo==POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                                                      : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(abertura<=0) continue;

      double movimentoPercent;
      if(tipo==POSITION_TYPE_BUY)
         movimentoPercent = (abertura - precoAtual) / abertura * 100.0;
      else
         movimentoPercent = (precoAtual - abertura) / abertura * 100.0;

      if(movimentoPercent >= InpViolinadaPercent)
        {
         Print("VIOLINADA (backstop) no ticket ", ticket, " (", movimentoPercent, "% contra). Fechando imediatamente.");
         trade.PositionClose(ticket);
        }
     }
  }

//+------------------------------------------------------------------+
//| Meta de lucro diaria + trava de perda diaria + protecao flutuante  |
//+------------------------------------------------------------------+
void VerificarMetaETravaDiaria()
  {
   if(bancaInicioDia<=0) return;

   double lucroDia = LucroRealizadoDoDia();
   double lucroDiaPercent = lucroDia / bancaInicioDia * 100.0;

   if(!pararNovasOrdens && lucroDiaPercent >= InpMetaDiariaPercent)
     {
      pararNovasOrdens = true;
      Print("META DIARIA de ", InpMetaDiariaPercent, "% atingida (", lucroDiaPercent,
            "%). Parando de enviar novas ordens.");
     }

   if(!pararNovasOrdens && lucroDiaPercent <= -InpPerdaDiariaMaxPercent)
     {
      pararNovasOrdens = true;
      Print("TRAVA DE PERDA DIARIA de ", InpPerdaDiariaMaxPercent, "% acionada (", lucroDiaPercent,
            "%). Parando de enviar novas ordens.");
     }

   // So protege flutuacao residual quando a PARADA foi por META BATIDA (lucro positivo no dia)
   if(pararNovasOrdens && lucroDia>0)
     {
      double prejuizoFlutuante = MathAbs(SomaPrejuizoFlutuante());
      double limite = lucroDia * (InpProtecaoFlutuantePercent/100.0);

      if(prejuizoFlutuante >= limite && prejuizoFlutuante>0)
        {
         Print("Prejuizo flutuante (", prejuizoFlutuante, ") atingiu ", InpProtecaoFlutuantePercent,
               "% do lucro do dia (", lucroDia, "). Fechando todas as ordens abertas imediatamente.");
         FecharTodasPosicoes();
        }
     }
  }

//+------------------------------------------------------------------+
void FecharTodasPosicoes()
  {
   for(int i=PositionsTotal()-1; i>=0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;

      trade.PositionClose(ticket);
     }
  }

//+------------------------------------------------------------------+
int ObterSinal()
  {
   double precoAtual = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double precoAnterior = iClose(_Symbol, PERIOD_CURRENT, InpSinalLookback);

   if(precoAnterior<=0) return 0;

   double variacaoPercent = (precoAtual - precoAnterior) / precoAnterior * 100.0;

   if(variacaoPercent >= InpSinalMovimentoMinimo)
      return 1;

   if(variacaoPercent <= -InpSinalMovimentoMinimo)
      return -1;

   return 0;
  }

//+------------------------------------------------------------------+
void GerenciarDirecao(bool ehCompra)
  {
   int totalAbertas = ContarPosicoes(ehCompra);

   if(totalAbertas==0)
     {
      if(ContarTotalPosicoes() >= InpMaxOrdensTotal)
         return;

      int sinal = ObterSinal();
      if((ehCompra && sinal==1) || (!ehCompra && sinal==-1))
        {
         AbrirOrdem(ehCompra, 1);
        }
      return;
     }

   if(ContarTotalPosicoes() >= InpMaxOrdensTotal)
      return;

   double refPrice = ehCompra ? buyRefPrice : sellRefPrice;
   if(refPrice<=0) return;

   double precoAtual = ehCompra ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);

   double recuoPercent;
   if(ehCompra)
      recuoPercent = (refPrice - precoAtual) / refPrice * 100.0;
   else
      recuoPercent = (precoAtual - refPrice) / refPrice * 100.0;

   if(recuoPercent <= 0) return;

   for(int nivel=1; nivel<6; nivel++)
     {
      bool jaAberto = ehCompra ? buyLevelAberto[nivel] : sellLevelAberto[nivel];
      if(jaAberto) continue;

      if(recuoPercent >= NiveisRecuoPercent[nivel])
        {
         AbrirOrdem(ehCompra, nivel+1);
        }
      break;
     }
  }

//+------------------------------------------------------------------+
//| Abre uma ordem (1 a 6) com SL obrigatorio + TP individual,         |
//| usando o lote calculado (reduz apos perdas seguidas, nunca aumenta)|
//+------------------------------------------------------------------+
void AbrirOrdem(bool ehCompra, int numeroOrdem)
  {
   double preco = ehCompra ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double tpPercent = TPNiveisPercent[numeroOrdem-1];
   double lote = CalcularLoteAtual();

   double tp, sl;
   if(ehCompra)
     {
      tp = preco * (1.0 + tpPercent/100.0);
      sl = preco * (1.0 - InpSL_Percent/100.0);
     }
   else
     {
      tp = preco * (1.0 - tpPercent/100.0);
      sl = preco * (1.0 + InpSL_Percent/100.0);
     }

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   tp = NormalizeDouble(tp, digits);
   sl = NormalizeDouble(sl, digits);

   string comentario = StringFormat("fybot_%s_%d", ehCompra?"B":"S", numeroOrdem);

   bool ok = ehCompra ? trade.Buy(lote, _Symbol, preco, sl, tp, comentario)
                       : trade.Sell(lote, _Symbol, preco, sl, tp, comentario);

   if(ok)
     {
      if(ehCompra)
        {
         buyLevelAberto[numeroOrdem-1] = true;
         if(numeroOrdem==1) buyRefPrice = preco;
        }
      else
        {
         sellLevelAberto[numeroOrdem-1] = true;
         if(numeroOrdem==1) sellRefPrice = preco;
        }
      Print("Ordem ", numeroOrdem, " (", ehCompra?"COMPRA":"VENDA", ") lote=", lote,
            " aberta em ", preco, " | SL: ", sl, " | TP: ", tp, " (", tpPercent, "%)");
     }
   else
     {
      Print("Falha ao abrir Ordem ", numeroOrdem, " (", ehCompra?"COMPRA":"VENDA", "). Erro: ", GetLastError());
     }
  }
//+------------------------------------------------------------------+
