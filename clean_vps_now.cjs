const { Client } = require('ssh2');

const conn = new Client();
const cmd = `cd /root/fybot && rm -f check_*.cjs test_*.cjs test_*.js fix_*.cjs fix_*.js search_*.js search_*.cjs upload_*.cjs deploy_*.cjs brute_force_fix.cjs cleanup.js clear_db_final.cjs copy_bots.cjs delete_user.cjs ENVIAR_CORRECOES_SEGURAS.cjs fetch_logs.cjs get_users.cjs grant_license.cjs inject_master.cjs mudar_para_m5.cjs read_env.cjs read_logs.cjs reset.js reset_ghost.cjs restart_pm2.cjs retroactive_commissions.cjs run_clean_vps.cjs verify_server.cjs ATUALIZACAO_FYBOT.zip dist.zip fybot_codigo.zip pm2_logs.txt status.json db_vps.json DerivBotEngineEMA.ts delete_bugged_users.cjs clear_trade_vps.cjs read_html.cjs restart_vps.cjs fix_all_orphans.cjs fix_referrals_db.cjs fix_vps_auto.cjs && rm -rf __LIMPEZA_BACKUP__`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('DONE', code);
      console.log(output);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 10000,
});
