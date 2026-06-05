import sys
import json
import MetaTrader5 as mt5

def check_limits(symbol):
    if not mt5.initialize():
        print(json.dumps({"success": False, "error": "MT5 init failed"}))
        return
        
    symbol_info = mt5.symbol_info(symbol)
    if not symbol_info:
        # try to find it
        symbols = mt5.symbols_get()
        if symbols:
            for s in symbols:
                if symbol in s.name:
                    symbol_info = s
                    break
                    
    if not symbol_info:
        print(json.dumps({"success": False, "error": f"Symbol {symbol} not found"}))
        mt5.shutdown()
        return

    price = symbol_info.ask
    point = symbol_info.point
    
    tp_006_pct_val = price * 0.0006
    tp_points = tp_006_pct_val / point

    res = {
        "success": True,
        "symbol": symbol_info.name,
        "spread": symbol_info.spread,
        "stops_level": symbol_info.trade_stops_level,
        "freeze_level": symbol_info.trade_freeze_level,
        "ask_price": price,
        "point": point,
        "tp_0.06%_in_points": tp_points,
        "will_it_conflict": "YES" if tp_points <= symbol_info.trade_stops_level else "NO"
    }
    print(json.dumps(res, indent=2))
    mt5.shutdown()

if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "XAUUSD"
    check_limits(sym)
