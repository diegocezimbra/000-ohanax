import pg from 'pg';
import { MongoClient } from 'mongodb';

const { Pool } = pg;

// PostgreSQL connections
const authPool = new Pool({
  connectionString: 'postgres://postgres:o9OnFWxpOvtxzK0sCbp25X8QXciZJvyYbPRPXe0RSIn3GYGXzUpJ5wZmKuIV5SGV@5.161.213.157:5432/postgres',
  max: 5
});

const billingPool = new Pool({
  connectionString: 'postgres://postgres:UwRYH9tCN2yfayHYRPRY3u1RmvbuebMrcyZMMLPflfEq2dQi7Kf7XBQLer14trsD@5.161.213.157:5433/postgres',
  max: 5
});

const securityPool = new Pool({
  connectionString: 'postgres://postgres:txU83gIyEInfWS8jXpPfAK2cshyfBtYL6gaxqSnit5Jwqvu6KnVvRdqf3WPBKWrl@5.161.213.157:5437/postgres',
  max: 5
});

// MongoDB connection
const mongoUrl = 'mongodb://root:sU2fl3cVZXZnXz4eA3WKSwRG0H8oj5OF6UuDWDWEkY679XiSlbvPHFOGtdRlsdI4@5.161.213.157:5438/oentregador?directConnection=true&authSource=admin';
let mongoClient = null;
let mongoDB = null;

async function connectMongo() {
  try {
    if (!mongoClient || !mongoDB) {
      mongoClient = new MongoClient(mongoUrl);
      await mongoClient.connect();
      mongoDB = mongoClient.db('oentregador');
      console.log('MongoDB connected successfully');
    }
    return mongoDB;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    mongoClient = null;
    mongoDB = null;
    throw err;
  }
}

export const db = {
  auth: authPool,
  billing: billingPool,
  security: securityPool,
  mongo: connectMongo
};
