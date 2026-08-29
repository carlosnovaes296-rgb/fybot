const { Client } = require('ssh2');
const conn = new Client();

const filesToUpload = [
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\FYBOT_API_Logic.mq5',
    remote: '/root/fybot/public/FYBOT_API_Logic.mq5'
  },
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\downloads\\\\FYBOT_API_Logic.mq5',
    remote: '/root/fybot/public/downloads/FYBOT_API_Logic.mq5'
  },
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\Fybot_Sniper.mq5',
    remote: '/root/fybot/public/Fybot_Sniper.mq5'
  },
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\downloads\\\\Fybot_Sniper.mq5',
    remote: '/root/fybot/public/downloads/Fybot_Sniper.mq5'
  },
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\Fybot_Sniper_Free.mq5',
    remote: '/root/fybot/public/Fybot_Sniper_Free.mq5'
  },
  {
    local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\public\\\\downloads\\\\Fybot_Sniper_Free.mq5',
    remote: '/root/fybot/public/downloads/Fybot_Sniper_Free.mq5'
  }
];

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let uploadedCount = 0;
    filesToUpload.forEach(file => {
      sftp.fastPut(file.local, file.remote, (err) => {
        if (err) throw err;
        console.log(`Arquivo ${file.remote} enviado com sucesso!`);
        
        uploadedCount++;
        if (uploadedCount === filesToUpload.length) {
          console.log('Todos os arquivos foram enviados.');
          conn.end();
        }
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
