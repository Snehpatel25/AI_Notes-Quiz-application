import pool from './connection';
import fs from 'fs';
import path from 'path';
async function migrate() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Database migration completed successfully!');
    }
    catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
migrate();
