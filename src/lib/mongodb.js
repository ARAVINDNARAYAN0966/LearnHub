import "server-only";
import mongoose from "mongoose";

const cached = globalThis.mongooseConnection ?? {
  connection: null,
  promise: null,
};

if (!globalThis.mongooseConnection) {
  globalThis.mongooseConnection = cached;
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
