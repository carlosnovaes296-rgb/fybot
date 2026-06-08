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
        
        # Parâmetros: Stop Loss de 0.50% e Take Profit de 0.03%
        sl_pct = 0.0050
        tp_pct = 0.0003
        
        # Ensure we are outside the minimum stops level
        min_stops = symbol_info.trade_stops_level
        min_distance = (min_stops + 10) * point
        
        if action.upper() == "BUY":
            order_type = mt5.ORDER_TYPE_BUY
            price = mt5.symbol_info_tick(symbol).ask
            
            raw_sl = price - (price * sl_pct)
            raw_tp = price + (price * tp_pct)
            
            # Fallback de segurança contra Error 10016
            if price - raw_sl < min_distance: raw_sl = price - min_distance
            if raw_tp - price < min_distance: raw_tp = price + min_distance
            
            sl = round(raw_sl, digits)
            tp = round(raw_tp, digits)
        else:
            order_type = mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(symbol).bid
            
            raw_sl = price + (price * sl_pct)
            raw_tp = price - (price * tp_pct)
            
            # Fallback de segurança contra Error 10016
            if raw_sl - price < min_distance: raw_sl = price + min_distance
            if price - raw_tp < min_distance: raw_tp = price - min_distance
            
            sl = round(raw_sl, digits)
            tp = round(raw_tp, digits)
            
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
