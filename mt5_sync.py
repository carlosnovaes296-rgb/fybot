import sys
import json
from datetime import datetime, timedelta

def get_mt5_data():
    try:
        import MetaTrader5 as mt5
        
        # Initialize MT5 connection
        if not mt5.initialize():
            return {"error": "Failed to initialize MT5", "success": False}
        
        # Get account info
        account_info = mt5.account_info()
        
        if account_info != None:
            # Get history deals for today
            today = datetime.now()
            start = datetime(today.year, today.month, today.day) - timedelta(days=7)
            end = today + timedelta(days=1)
            deals = mt5.history_deals_get(start, end)
            
            history_list = []
            if deals:
                for deal in deals:
                    # entry: 0=IN, 1=OUT, 2=INOUT
                    if deal.entry == 1 or deal.entry == 2:
                        history_list.append({
                            "id": deal.position_id,
                            "symbol": deal.symbol,
                            "type": "BUY" if deal.type == 1 else "SELL",
                            "lot": deal.volume,
                            "openPrice": deal.price,
                            "time": datetime.fromtimestamp(deal.time).isoformat() + "Z",
                            "status": "CLOSED",
                            "profit": deal.profit
                        })
            
            # Get open positions
            positions = mt5.positions_get()
            if positions:
                for pos in positions:
                    history_list.append({
                        "id": pos.ticket,
                        "symbol": pos.symbol,
                        "type": "BUY" if pos.type == 0 else "SELL",
                        "lot": pos.volume,
                        "openPrice": pos.price_open,
                        "time": datetime.fromtimestamp(pos.time).isoformat() + "Z",
                        "status": "OPEN",
                        "profit": pos.profit
                    })
            
            # Sort history so newest is first
            history_list.reverse()

            data = {
                "balance": account_info.balance,
                "equity": account_info.equity,
                "server": account_info.server,
                "accountType": "REAL" if "REAL" in account_info.server.upper() else "DEMO",
                "history": history_list,
                "success": True
            }
        else:
            data = {"error": "Failed to get account info", "success": False}
            
        mt5.shutdown()
        return data
        
    except Exception as e:
        return {"error": str(e), "success": False}

if __name__ == "__main__":
    result = get_mt5_data()
    print(json.dumps(result))
