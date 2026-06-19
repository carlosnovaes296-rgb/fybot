import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
const MONGO_URI = 'mongodb+srv://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mdb-nyc1-44873-366e470d.mongo.ondigitalocean.com/fybot?tls=true&authSource=admin';
const localDb = fs.readFileSync('./data/db.json', 'utf8');

// Write a migration script file and upload it to the server
const migrationScriptContent = `
const mongoose = require('/root/fybot/node_modules/mongoose');
const fs = require('fs');

const MONGO_URI = '${MONGO_URI}';
const FybotSchema = new mongoose.Schema({ id: { type: Number, default: 1, unique: true }, data: mongoose.Schema.Types.Mixed });
const FybotDB = mongoose.model('FybotDB', FybotSchema);

const localData = JSON.parse(fs.readFileSync('/root/fybot/data/db.json', 'utf8'));

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB DigitalOcean!');
  await FybotDB.findOneAndUpdate({ id: 1 }, { data: localData }, { upsert: true, new: true });
  console.log('✅ All data migrated to MongoDB successfully!');
  console.log('Users:', localData.users?.length || 0);
  console.log('Licenses:', localData.licenses?.length || 0);
  process.exit(0);
}).catch(e => { 
  console.error('❌ MONGO ERROR:', e.message); 
  process.exit(1); 
});
`;

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading migration script...');
  
  // Upload the migration script file via SFTP
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const writeStream = sftp.createWriteStream('/root/fybot/do-migrate.cjs');
    writeStream.write(migrationScriptContent);
    writeStream.end();
    writeStream.on('close', () => {
      console.log('📤 Migration script uploaded. Running migration...');
      
      conn.exec('node /root/fybot/do-migrate.cjs', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
          if (code === 0) {
            console.log('🔄 Restarting server with MongoDB enabled...');
            conn.exec('pm2 restart fybot', (err2, stream2) => {
              if (err2) throw err2;
              stream2.on('close', () => {
                console.log('\n🎉 MIGRATION COMPLETE! Server is now running with MongoDB DigitalOcean!');
                conn.end();
              }).on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
            });
          } else {
            console.error('❌ Migration failed!');
            conn.end();
          }
        }).on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
