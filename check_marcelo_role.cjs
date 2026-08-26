const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const query = "SELECT id, name, role FROM users WHERE name LIKE '%MARCELO BONANI DA SILVA%';";
  conn.exec(`mysql -u root -p"Fybot2026!" fybot_db -e "${query}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', d => console.log(d.toString())).stderr.on('data', d => console.log(d.toString()));
  });
}).on('error', (err) => {
  console.error("SSH Error: ", err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
