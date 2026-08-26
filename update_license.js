const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('mysql -u fybot -p"Fybot@2024!" fybot_db -e "UPDATE users SET licenseExpiryDate = DATE_ADD(NOW(), INTERVAL 365 DAY) WHERE name LIKE \\'%MARCELO BONANI DA SILVA%\\';"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log("Done");
      conn.end();
    }).on('data', d => console.log(d.toString())).stderr.on('data', d => console.log(d.toString()));
  });
}).on('error', (err) => {
  console.error("SSH Error: ", err);
}).connect({
  host: '194.163.143.193',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('c:\\Users\\sobit\\.ssh\\id_rsa')
});
