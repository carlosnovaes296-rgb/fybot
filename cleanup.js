const fs = require('fs');
const dbFile = 'c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro/backend/db/database.json';

try {
    const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    let changed = false;

    // Remove $20 from jfcn2020@gmail.com where referredEmail is cleitongoncalvez07@gmail.com
    // Remove $20 from cleitongoncalvez07@gmail.com where referredEmail is marcelo_bona@hotmail.com

    const targets = ['cleitongoncalvez07@gmail.com', 'marcelo_bona@hotmail.com'];

    for (let i = db.referralEarnings.length - 1; i >= 0; i--) {
        const e = db.referralEarnings[i];
        if (targets.includes(e.referredEmail) && e.amount === 20) {
            console.log('Removing earning: ', e);
            db.referralEarnings.splice(i, 1);
            
            // Adjust balance
            const sponsor = db.users.find(u => u.id === e.referrerId);
            if (sponsor) {
                sponsor.balance = Math.max(0, (sponsor.balance || 0) - 20);
                console.log(`Adjusted balance for ${sponsor.email} to ${sponsor.balance}`);
            }
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
        console.log('Database updated successfully.');
    } else {
        console.log('No matching earnings found.');
    }

} catch (err) {
    console.error(err);
}
