import { connectDB, closeDB } from '../config/database.js';
import { migrateBrands } from '../services/migrationService.js';

// This script can be executed manually during development via
//   pnpm --filter sentiment-intelligence-backend migrate
// or automatically from the Docker entrypoint.  It upserts the bundle of
// supported brands into the `brands` collection so the frontend has something
// to display and the scraper code can look up the correct type.

async function main() {
  await connectDB();
  await migrateBrands();
  await closeDB();
}

main().catch((err) => {
  console.error('Brand migration failed:', err);
  process.exit(1);
});
