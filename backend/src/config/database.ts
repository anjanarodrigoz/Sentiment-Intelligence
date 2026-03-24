import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || "sentiment_intelligence" ;

  // Securely log URI parts to help debug deployment
  const protocol = uri.split('://')[0];
  const hostPart = uri.includes('@') ? uri.split('@')[1] : uri.split('://')[1];
  console.log(`[Database] Attempting to connect to ${protocol}://${hostPart?.split('/')[0]}...`);

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);

    console.log(`Connected to MongoDB: ${dbName}`);

    // Create indexes
    await createIndexes(db);

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

async function createIndexes(db: Db): Promise<void> {
  try {
    // Products collection indexes
    await db.collection('products').createIndex({ urlHash: 1 }, { unique: true });
    await db.collection('products').createIndex({ brandId: 1 });
    await db.collection('products').createIndex({ updatedAt: -1 });

    // Product versions collection indexes
    await db.collection('product_versions').createIndex(
      { productId: 1, version: 1 },
      { unique: true }
    );
    await db.collection('product_versions').createIndex(
      { productId: 1, scrapedAt: -1 }
    );
    await db.collection('product_versions').createIndex({ scrapedAt: -1 });

    // Reviews collection indexes
    await db.collection('reviews').createIndex(
      { productVersionId: 1, createdAt: -1 }
    );
    await db.collection('reviews').createIndex(
      { productId: 1, version: 1 }
    );
    await db.collection('reviews').createIndex({ productVersionId: 1 });
    await db.collection('reviews').createIndex(
      { productId: 1, reviewHash: 1 },
      { unique: true }
    );

    // Brands collection indexes
    await db.collection('brands').createIndex({ id: 1 }, { unique: true });
    await db.collection('brands').createIndex({ isActive: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw - indexes might already exist
  }
}
