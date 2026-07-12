import WebSocket from 'ws';

export const derivSocket = {
  authorizeAndFetchAccounts: (appId: string, token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to Deriv WS with app_id ${appId}`);
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

      ws.on('open', () => {
        // Send authorize request
        ws.send(JSON.stringify({ authorize: token }));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          
          if (response.error) {
            ws.close();
            return reject(new Error(response.error.message));
          }

          if (response.msg_type === 'authorize') {
            // Authorized successfully, fetch account list
            const authData = response.authorize;
            if (authData.account_list && authData.account_list.length > 0) {
              // Get the actual real or demo accounts
              ws.close();
              resolve(authData);
            } else {
              ws.close();
              reject(new Error('No accounts found for this token'));
            }
          }
        } catch (err) {
          ws.close();
          reject(err);
        }
      });

      ws.on('error', (error) => {
        console.error('Deriv WS Error:', error);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          reject(new Error('WebSocket connection timed out'));
        }
      }, 10000);
    });
  }
};
