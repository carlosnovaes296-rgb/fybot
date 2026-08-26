import { pool } from './backend/db/mysql.ts';

async function main() {
    try {
        console.log("Adding phone column...");
        await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ''");
        console.log("Success!");
    } catch (e) {
        console.error("Error or column already exists:", e);
    }
    process.exit(0);
}

main();
