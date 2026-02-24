import { connectDB, closeDB } from '../config/database.js';
import { migrateBrands } from '../services/migrationService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  try {
    console.log('Starting brand migration...');
    await connectDB();
    await migrateBrands();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
    process.exit(0);
  }
}

runMigration();
