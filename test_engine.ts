import { DerivBotEngineEMA } from './backend/services/DerivBotEngine.ts';

async function testEngine() {
    console.log('--- TESTANDO MOTOR DERIV ---');
    const engine = new DerivBotEngineEMA();
    
    engine.onLog = (msg) => console.log('UI LOG:', msg);
    engine.onRegimeChange = (regime) => console.log('REGIME:', regime);
    engine.onSignal = (direction, price, reason, tp, sl) => {
        console.log('!!! SINAL !!!', {direction, price, reason, tp, sl});
    };

    // Usando o token real ou demo para teste
    const token = 'h9YPYh9C'; // O token que o usuario tem na screenshot não está completo. 
    // Vamos apenas usar a função interna de WebSocket com um token vazio se puder, mas a Deriv precisa de token.
    // Mas wait, o DerivBotEngineEMA precisa do token pra pegar a Magic URL.
    
    console.log('Iniciando conexao cega para pegar ticks publicos de frxXAUUSD (nao logado)');
    // A Deriv permite assinar ticks sem estar logado!
    
    // Vamos forçar a conexão sem token:
    engine['finalWsUrl'] = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
    engine['connectWithToken'] = async function() {
        this.ws = new (require('ws'))(this.finalWsUrl);
        this.ws.on('open', () => {
            console.log('WS OPENED');
            this.isAuthorized = true; // Burlar para testes
            this.requestCandleHistory();
        });
        this.ws.on('message', (data) => {
            const resp = JSON.parse(data);
            if(resp.msg_type === 'candles') {
                console.log('CANDLES RECEBIDOS:', resp.req_id, resp.candles.length);
            }
            if(resp.msg_type === 'ohlc') {
                console.log('TICK OHLC:', resp.ohlc.granularity, resp.ohlc.epoch, resp.ohlc.close);
            }
            
            // Replicar o handler
            if (resp.msg_type === 'ohlc') {
                const ohlc = resp.ohlc;
                const candle = {
                    epoch: ohlc.open_time,
                    open: Number(ohlc.open),
                    high: Number(ohlc.high),
                    low: Number(ohlc.low),
                    close: Number(ohlc.close)
                };
                const ohlcGran = Number(ohlc.granularity);
                if (ohlcGran === 3600) {
                    this.updateCandleSeries(this.candlesH1, candle);
                } else if (ohlcGran === 300) {
                    const isNew = this.updateCandleSeries(this.candlesM5, candle);
                    console.log('isNewCandle:', isNew);
                    if (isNew) this.analyzeMarket();
                }
            }
        });
        this.ws.on('error', (err) => console.log('ERRO WS:', err));
        this.ws.on('close', () => console.log('FECHOU WS'));
    };

    engine.connectWithToken('');
}

testEngine();
