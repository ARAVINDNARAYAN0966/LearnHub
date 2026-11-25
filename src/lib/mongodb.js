import "server-only";
import mongoose from "mongoose";

const cached = globalThis.mongooseConnection ?? {
  connection: null,
  promise: null,
};

if (!globalThis.mongooseConnection) {
  globalThis.mongooseConnection = cached;
}

export function isDatabaseConnectionError(error) {
  if (!error || typeof error !== "object") return false;

  const name = typeof error.name === "string" ? error.name : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTimeoutError" ||
    name === "MongoTopologyClosedError" ||
    name === "MongoNotConnectedError" ||
    name === "ServerSelectionTimeoutError" ||
    (name === "MongooseError" && message.includes("buffering timed out"))
  );
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  if (cached.connection && mongoose.connection.readyState === 1) {
    return cached.connection;
  }

  if (cached.promise && mongoose.connection.readyState === 2) {
    return cached.promise;
  }

  cached.connection = null;
  cached.promise = null;

  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  cached.promise = mongoose
    .connect(uri, connectionOptions)
    .then((mongooseInstance) => {
      cached.connection = mongooseInstance;
      return mongooseInstance;
    })
    .catch((error) => {
      cached.promise = null;
      cached.connection = null;
      throw error;
    });

  return cached.promise;
}


