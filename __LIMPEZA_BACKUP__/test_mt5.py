import sys
try:
    import MetaTrader5 as mt5
    if not mt5.initialize():
        print("initialize() failed")
        mt5.shutdown()
        sys.exit(1)
    
    account_info = mt5.account_info()
    if account_info!=None:
        print(f"Balance: {account_info.balance}")
    else:
        print("Failed to get account info")
    mt5.shutdown()
except Exception as e:
    print(f"Error: {e}")
