import sys
import json
import MetaTrader5 as mt5

def execute_trade(symbol, action, lot):
    try:
        if not mt5.initialize():
            return {"success": False, "error": "MT5 Initialization failed"}
        
        # Find matching symbol to handle broker suffixes (e.g., EURUSDm, EURUSDc)
        found_symbol = None
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is not None:
            found_symbol = symbol_info.name
        else:
            symbols = mt5.symbols_get()
            if symbols:
                for s in symbols:
                    if symbol in s.name:
                        found_symbol = s.name
                        break
                        
        if not found_symbol:
            mt5.shutdown()
            return {"success": False, "error": f"Symbol {symbol} not found or not available"}
            
        symbol = found_symbol
        symbol_info = mt5.symbol_info(symbol)
        
        # Select symbol
        if not mt5.symbol_select(symbol, True):
            mt5.shutdown()
            return {"success": False, "error": f"Symbol {symbol} not found or not available"}

        # Determine order type and price
        point = symbol_info.point
        digits = symbol_info.digits
        # Ensure we are outside the minimum stops level
        min_stops = symbol_info.trade_stops_level
        sl_points = max(500, min_stops + 50)
        tp_points = max(1000, min_stops + 100)
        
        if action.upper() == "BUY":
            order_type = mt5.ORDER_TYPE_BUY
            price = mt5.symbol_info_tick(symbol).ask
            sl = round(price - (sl_points * point), digits)
            tp = round(price + (tp_points * point), digits)
        else:
            order_type = mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(symbol).bid
            sl = round(price + (sl_points * point), digits)
            tp = round(price - (tp_points * point), digits)
            
        # Ensure volume is valid for the broker
        volume = float(lot)
        if symbol_info is not None:
            min_vol = symbol_info.volume_min
            if volume < min_vol:
                volume = min_vol
            # Round to step
            step_vol = symbol_info.volume_step
            import math
            volume = round(math.floor(volume / step_vol) * step_vol, 3)
            if volume < min_vol:
                volume = min_vol

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": order_type,
            "price": price,
            "sl": sl,
            "tp": tp,
            "deviation": 20,
            "magic": 234000,
            "comment": "Fybot",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC, # Usually IOC is required by Exness
        }
        
        result = mt5.order_send(request)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            error_msg = f"Trade failed. Error code: {result.retcode}. Comment: {result.comment}"
            mt5.shutdown()
            return {"success": False, "error": error_msg}
            
        mt5.shutdown()
        return {
            "success": True, 
            "ticket": result.order, 
            "price": result.price, 
            "volume": result.volume
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "No arguments provided"}))
        sys.exit(1)
        
    try:
        symbol = sys.argv[1]
        action = sys.argv[2]
        lot = sys.argv[3]
        res = execute_trade(symbol, action, lot)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
