import 'dotenv/config';
import { getDB, connectDB, closeDB } from '../config/database.js';

async function checkDatabase() {
  const db = await connectDB();

  console.log('Connected to database:', db.databaseName);
  console.log('');

  // Check product_versions count
  const versionCount = await db.collection('product_versions').countDocuments();
  console.log('Total product_versions:', versionCount);

  // Check if any have reviews field
  const withReviews = await db.collection('product_versions').countDocuments({ reviews: { $exists: true } });
  console.log('Versions with reviews field:', withReviews);

  // Check reviews collection
  const reviewCount = await db.collection('reviews').countDocuments();
  console.log('Total reviews in separate collection:', reviewCount);

  // Get a sample version
  const sample = await db.collection('product_versions').findOne({});
  if (sample) {
    console.log('\nSample product_version structure:');
    console.log('- Has _id:', !!sample._id);
    console.log('- Has reviews field:', 'reviews' in sample);
    console.log('- reviewCount:', sample.reviewCount);
    console.log('- version:', sample.version);
  } else {
    console.log('\nNo product_versions found in database');
  }

  await closeDB();
}

checkDatabase().catch(console.error);
