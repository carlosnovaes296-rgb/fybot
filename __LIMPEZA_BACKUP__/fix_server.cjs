const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Remove the invalid state.stopOpeningNewOrders = false;
code = code.replace(/const isTradingTime = \(\): boolean => \{\s*const now = new Date\(\);\s*state\.stopOpeningNewOrders = false;/, `const isTradingTime = (): boolean => {\n  const now = new Date();`);

// 2. Extract the custom error handler
const errHandlerRegex = /app\.use\(\(err: any, req: any, res: any, next: any\) => \{\s*console\.error\("Server Error:", err\);\s*res\.status\(500\)\.json\(\{ error: "Internal Server Error" \}\);\s*\}\);/;
const match = code.match(errHandlerRegex);

if (match) {
  // 3. Remove it from its original position
  code = code.replace(errHandlerRegex, '');

  // 4. Insert it right before app.listen
  const listenRegex = /app\.listen\(PORT, '0\.0\.0\.0', \(\) => \{/;
  if (code.match(listenRegex)) {
    code = code.replace(listenRegex, `${match[0]}\n\n  app.listen(PORT, '0.0.0.0', () => {`);
  }
}

fs.writeFileSync('server.ts', code);
console.log('server.ts fixed');
