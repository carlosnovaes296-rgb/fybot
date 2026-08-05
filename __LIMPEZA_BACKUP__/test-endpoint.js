fetch('https://fybot.life/api/ea/heartbeat', { method: 'POST', body: '{}', headers: {'Content-Type': 'application/json'} }).then(res => res.text()).then(console.log).catch(console.error);
