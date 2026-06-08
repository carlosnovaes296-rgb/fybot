import sys
import json
import MetaTrader5 as mt5

def calc_ema(prices, period):
    if len(prices) == 0:
        return 0
    multiplier = 2 / (period + 1)
    ema = prices[0]
    for price in prices[1:]:
        ema = (price - ema) * multiplier + ema
    return ema

def calc_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50
    gains = []
    losses = []
    for i in range(1, len(prices)):
        diff = prices[i] - prices[i-1]
        if diff > 0:
            gains.append(diff)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(diff))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

def calculate_signals(symbols):
    if not mt5.initialize():
        return {"success": False, "error": "MT5 init failed"}
        
    results = {}
    
    for sym in symbols:
        found_symbol = None
        symbol_info = mt5.symbol_info(sym)
        if symbol_info is not None:
            found_symbol = symbol_info.name
        else:
            all_syms = mt5.symbols_get()
            if all_syms:
                for s in all_syms:
                    if sym in s.name:
                        found_symbol = s.name
                        break
        
        if not found_symbol:
            continue
            
        real_sym = found_symbol
        
        # Get last 50 candles of M5 for faster reaction to market drops
        rates = mt5.copy_rates_from_pos(real_sym, mt5.TIMEFRAME_M5, 0, 50)
        if rates is None or len(rates) < 50:
            continue
            
        close_prices = [float(r[4]) for r in rates] # r[4] is close price
        current_price = close_prices[-1]
        
        # Use faster EMAs (9 and 21) to catch sudden drops quickly
        ema9 = calc_ema(close_prices[-9:], 9)
        ema21 = calc_ema(close_prices[-21:], 21)
        
        if ema9 > ema21 and current_price > ema9:
            smc_dir = "BUY"
            smc_score = 85.0
        elif ema9 < ema21 and current_price < ema9:
            smc_dir = "SELL"
            smc_score = 85.0
        else:
            smc_dir = "BUY" if current_price > ema21 else "SELL"
            smc_score = 45.0
            
        rsi = calc_rsi(close_prices, 14)
        if rsi > 55:
            mom_dir = "BUY"
            mom_score = rsi
        elif rsi < 45:
            mom_dir = "SELL"
            mom_score = 100 - rsi
        else:
            mom_dir = "NEUTRAL"
            mom_score = 50.0
            
        results[sym] = {
            "smcScore": smc_score,
            "momScore": mom_score,
            "smcDir": smc_dir,
            "momDir": mom_dir,
            "price": current_price
        }
        
    account_info = mt5.account_info()
    acc_data = None
    if account_info is not None:
        acc_data = {
            "balance": account_info.balance,
            "equity": account_info.equity,
            "server": account_info.server
        }

    today_realized_profit = 0.0
    try:
        from datetime import datetime, timedelta
        today_local_str = datetime.now().strftime('%Y-%m-%d')
        start_time = datetime.now() - timedelta(days=2)
        end_time = datetime.now() + timedelta(days=1)
        deals = mt5.history_deals_get(start_time, end_time)
        if deals:
            for deal in deals:
                if deal.entry in (1, 2) and deal.type != 2:
                    deal_local_str = datetime.fromtimestamp(deal.time).strftime('%Y-%m-%d')
                    if deal_local_str == today_local_str:
                        # Include profit, swap, commission and fee
                        total_profit = getattr(deal, 'profit', 0.0) + getattr(deal, 'swap', 0.0) + getattr(deal, 'commission', 0.0) + getattr(deal, 'fee', 0.0)
                        today_realized_profit += total_profit
    except Exception as e:
        pass

    positions = mt5.positions_get()
    open_tickets = [p.ticket for p in positions] if positions else []

    mt5.shutdown()
    
    if acc_data is not None:
        acc_data['today_realized_profit'] = today_realized_profit

    return {"success": True, "data": results, "open_tickets": open_tickets, "account": acc_data}

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            symbols = sys.argv[1:]
        else:
            symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"]
            
        res = calculate_signals(symbols)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
