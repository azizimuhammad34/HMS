import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { resetEnvCache } from "@/lib/env";

let mongo: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<string> {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  resetEnvCache();

  // Reset Next.js connection cache used by connectDb().
  global.mongooseCache = { conn: null, promise: null };

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  return uri;
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  global.mongooseCache = { conn: null, promise: null };
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
}

export async function clearTestDb(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
