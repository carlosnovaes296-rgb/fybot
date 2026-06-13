import sys
import json
import MetaTrader5 as mt5

def close_trade(ticket):
    try:
        if not mt5.initialize():
            return {"success": False, "error": "MT5 Initialization failed"}
            
        position = mt5.positions_get(ticket=int(ticket))
        if position is None or len(position) == 0:
            mt5.shutdown()
            return {"success": False, "error": f"Position {ticket} not found"}
            
        position = position[0]
        symbol = position.symbol
        action = mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).bid if action == mt5.ORDER_TYPE_SELL else mt5.symbol_info_tick(symbol).ask

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": position.volume,
            "type": action,
            "position": position.ticket,
            "price": price,
            "sl": 0.0,
            "tp": 0.0,
            "deviation": 20,
            "magic": 234000,
            "comment": "IAbot close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            error_msg = f"Trade close failed. Error code: {result.retcode}. Comment: {result.comment}"
            mt5.shutdown()
            return {"success": False, "error": error_msg}
            
        mt5.shutdown()
        return {
            "success": True, 
            "ticket": result.order, 
            "price": result.price
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No arguments provided"}))
        sys.exit(1)
        
    try:
        args = json.loads(sys.argv[1])
        res = close_trade(args.get("ticket"))
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
