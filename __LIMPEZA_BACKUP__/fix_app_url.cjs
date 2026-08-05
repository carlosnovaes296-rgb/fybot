const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Restore the affiliate link
content = content.replace(
  "onClick={() => {\n                  window.location.href = 'https://oauth.deriv.com/oauth2/authorize?app_id=33PZwcDs8NqrvpUw1vQIF&client_id=33PZwcDs8NqrvpUw1vQIF&redirect_uri=https://fybot.life/dashboard&l=PT&brand=deriv';\n                }}\n                className=\"flex-1 py-3 bg-transparent border border-white/10 rounded-xl text-[#FCD535] hover:bg-[#FCD535]/10 transition-all text-[16px] font-bold flex items-center justify-center gap-2\"\n              >\n                <Users size={20} />",
  "onClick={() => window.open('https://partner-tracking.deriv.com/click?a=43413&o=1&c=3&link_id=1', '_blank')}\n                className=\"flex-1 py-3 bg-transparent border border-white/10 rounded-xl text-[#FCD535] hover:bg-[#FCD535]/10 transition-all text-[16px] font-bold flex items-center justify-center gap-2\"\n              >\n                <Users size={20} />"
);

// Fix the ACTUAL connect button
content = content.replace(
  "app_id=33PVKdgTEIn9JlNjX0izq&client_id=33PVKdgTEIn9JlNjX0izq",
  "app_id=33PZwcDs8NqrvpUw1vQIF&client_id=33PZwcDs8NqrvpUw1vQIF"
);

// Also fix the WebSocket connection again just in case the previous one was wrong
content = content.replace(
  "app_id=33PVKdgTEIn9JlNjX0izq&l=PT",
  "app_id=33PZwcDs8NqrvpUw1vQIF&l=PT"
);

fs.writeFileSync(file, content);
console.log('App.tsx updated!');
