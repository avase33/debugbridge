import mongoose from 'mongoose';
import config from './index.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(config.mongo.uri, { maxPoolSize: 10 });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
    mongoose.connection.on('disconnected', () => { isConnected = false; });
    mongoose.connection.on('reconnected', () => { isConnected = true; });
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  }
}
