import fs from 'fs';
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://admin:1BJPkXYBRk2026%4026H@db-mdb-nyc1-44873-366e470d.mongo.ondigitalocean.com/fybot?tls=true&authSource=admin';

const FybotSchema = new mongoose.Schema({
  id: { type: Number, default: 1, unique: true },
  data: mongoose.Schema.Types.Mixed
});
const FybotDB = mongoose.models.FybotDB || mongoose.model('FybotDB', FybotSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    const localData = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
    await FybotDB.findOneAndUpdate({ id: 1 }, { data: localData }, { upsert: true });
    console.log('✅ Local data (users, licenses, configs) successfully uploaded to MongoDB Cloud!');
    process.exit(0);
  } catch (e) {
    console.error('Error migrating:', e);
    process.exit(1);
  }
}
migrate();
