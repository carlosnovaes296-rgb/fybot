//+------------------------------------------------------------------+
//|                                     FYBOT_V8_INSTITUTIONAL.mq5 |
//|                                  Copyright 2026, Fybot Pro Inc. |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "Fybot Pro Inc."
#property link      ""
#property version   "8.00"

#include <Trade\Trade.mqh>

//--- Inputs
input string LICENSE_KEY = "SEU-UUID-AQUI"; // Sua chave pessoal
input string API_URL = "http://209.97.163.75:3000/api/mt5/auth"; // Endereço do servidor
input double RiskPercent = 1.0; // % do saldo por trade
input double TP_RR = 2.0; // Take Profit = 2x o SL
input int    StopLossPoints = 100; // Stop Loss em pontos
input bool   EnableDemoTrade = true; // Habilitar trade automático de validação?

double initialBalance = 0.0;
CTrade trade; // Instância da classe de operações

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(LICENSE_KEY == "" || LICENSE_KEY == "SEU-UUID-AQUI") {
      Print("ERRO: Informe uma LICENSE_KEY válida!");
      return(INIT_FAILED);
   }

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);

   // Cria um timer para enviar dados para a API a cada 1 segundo
   EventSetTimer(1);

   Print("FYBOT V8 Inicializado com sucesso!");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("FYBOT V8 Desligado.");
  }

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   
   // Calcula lucro diario de forma simples
   double dailyProfit = balance - initialBalance;

   string accountType = "REAL";
   long tradeMode = AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(tradeMode == ACCOUNT_TRADE_MODE_DEMO) {
      accountType = "DEMO";
   }

   // Varrer e constuir array JSON com os trades abertos
   string tradesJson = "[";
   int totalPositions = PositionsTotal();
   for(int i = 0; i < totalPositions; i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0) {
         string pair = PositionGetString(POSITION_SYMBOL);
         long type = PositionGetInteger(POSITION_TYPE);
         string strType = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         double lot = PositionGetDouble(POSITION_VOLUME);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
         double profit = PositionGetDouble(POSITION_PROFIT);
         
         // Transforma os dados da ordem em objeto JSON
         string tradeObj = StringFormat(
            "{\"id\":\"%I64u\",\"pair\":\"%s\",\"type\":\"%s\",\"lot\":%.2f,\"openPrice\":%.5f,\"currentPrice\":%.5f,\"profit\":%.2f,\"status\":\"OPEN\"}",
            ticket, pair, strType, lot, openPrice, currentPrice, profit
         );
         
         tradesJson += tradeObj;
         if(i < totalPositions - 1) {
            tradesJson += ","; // separa os objetos por vírgula se não for o último
         }
      }
   }
   tradesJson += "]";

   // Constroi o Payload final
   string json = StringFormat(
      "{\"licenseKey\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"dailyProfit\":%.2f,\"accountType\":\"%s\",\"trades\":%s}",
      LICENSE_KEY, balance, equity, dailyProfit, accountType, tradesJson
   );

   // Array para os dados enviados e recebidos
   char postData[];
   char resultData[];
   string resultHeaders;
   int res;
   
   // Converte String para Array de char nativo
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // Remove o caractere null (\0) do final do array para evitar erro no payload HTTP
   ArrayResize(postData, ArraySize(postData) - 1);
   
   string headers = "Content-Type: application/json\r\n";

   // Dispara WebRequest
   res = WebRequest("POST", API_URL, headers, 3000, postData, resultData, resultHeaders);
   
   if(res == 200 || res == 201) {
      // Envio Ok
   } else {
      int err = GetLastError();
      if(res == 401) {
         Print("ERRO DE LICENÇA (401). Verifique sua chave ou validade no painel.");
      } else if (err == 4064 || err == 4014) {
         Print("ERRO DE PERMISSÃO (" + IntegerToString(err) + "): Vá no MT5 em Ferramentas -> Opções -> Expert Advisors -> Marque 'Permitir WebRequest' e adicione a URL: ", API_URL);
      } else {
         Print("Erro WebRequest. Res: ", res, " | Erro MT5: ", err, " | Detalhes: ", CharArrayToString(resultData));
      }
   }
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // LÓGICA DE ENTRADA: Se o robô não tiver nenhuma operação, abre uma operação configurada
   if (EnableDemoTrade && PositionsTotal() == 0) {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
      
      // Cálculo do SL e TP baseado em pontos e no Risco Retorno (TP_RR)
      double slPrice = NormalizeDouble(ask - (StopLossPoints * point), digits);
      double tpPrice = NormalizeDouble(ask + (StopLossPoints * TP_RR * point), digits);
      
      trade.Buy(0.01, _Symbol, ask, slPrice, tpPrice, "FyBot Real Trade");
      PrintFormat("Abrindo operação BUY em %s. Ask: %.*f | SL: %.*f | TP: %.*f", _Symbol, digits, ask, digits, slPrice, digits, tpPrice);
   }
  }
//+------------------------------------------------------------------+
