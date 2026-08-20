const fs = require('fs');
const path = require('path');

const filesToClean = [
  // .cjs / .js scripts
  'check_all_tokens.cjs', 'check_db_vps.cjs', 'check_dist.cjs', 'check_license.cjs', 'check_logs.cjs', 'check_mysql.cjs', 'check_mysql_vps.cjs', 'check_pm2.cjs', 'check_pm2_status.cjs', 'check_symbols.cjs', 'check_tokens.cjs', 'check_user.cjs', 'check_user2.cjs', 'check_users.cjs', 'check_vps_local.cjs', 'check_vps_local.js', 'check_vps_server.cjs',
  'test_api.cjs', 'test_app_id.cjs', 'test_build.cjs', 'test_build.js', 'test_compile.cjs', 'test_compile2.cjs', 'test_deriv_token.cjs', 'test_deriv_ws.cjs', 'test_health.cjs', 'test_ssh_now.cjs', 'test_token_1089.cjs', 'test_tsc.js', 'test_webhook.js', 'test-webhook-native.js', 'test_ws.cjs',
  'fix_admin.cjs', 'fix_all_orphans.cjs', 'fix_app_id.cjs', 'fix_keys_vps.cjs', 'fix_license_keys_local.cjs', 'fix_network.cjs', 'fix_referrals_db.cjs', 'fix_vps_auto.cjs', 'fix_vps_db.cjs', 'fix_vps_db.js',
  'search_app.cjs', 'search_balance.js', 'search_console.js', 'search_deriv.js', 'search_routes.cjs', 'search_savedb.cjs', 'search_table.js', 'search_webhook.js', 'search.js',
  'upload_dist.cjs', 'upload_engine.cjs', 'upload_manager.cjs', 'upload_server.cjs', 'upload_server_only.cjs',
  'deploy_env.cjs', 'deploy_production.cjs', 'deploy_vps.cjs',
  'brute_force_fix.cjs', 'cleanup.js', 'clear_db_final.cjs', 'clear_trade_vps.cjs', 'copy_bots.cjs', 'delete_bugged_users.cjs', 'delete_user.cjs', 'ENVIAR_CORRECOES_SEGURAS.cjs', 'fetch_logs.cjs', 'find_chart.cjs', 'find_chart.js', 'find_db.cjs', 'get_users.cjs', 'grant_license.cjs', 'grep_token.cjs', 'inject_master.cjs', 'mudar_para_m5.cjs', 'read_env.cjs', 'read_html.cjs', 'read_logs.cjs', 'reset.js', 'reset_ghost.cjs', 'restart_pm2.cjs', 'restart_vps.cjs', 'retroactive_commissions.cjs', 'run_clean_vps.cjs', 'verify_server.cjs',
  
  // Zips & Backups
  'ATUALIZACAO_FYBOT.zip', 'dist.zip', 'fybot_codigo.zip', '__LIMPEZA_BACKUP__',
  
  // Logs & Temps
  'pm2_logs.txt', 'status.json', 'db_vps.json',
  
  // Orphan TS
  'DerivBotEngineEMA.ts'
];

filesToClean.forEach(file => {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        fs.rmSync(p, { recursive: true, force: true });
      } else {
        fs.unlinkSync(p);
      }
      console.log('Deleted:', file);
    } catch (e) {
      console.error('Error deleting:', file, e.message);
    }
  }
});
