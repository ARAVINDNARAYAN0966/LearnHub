import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMongoose = vi.hoisted(() => ({
  connect: vi.fn(),
  connection: {
    readyState: 0,
    on: vi.fn(),
  },
}));

vi.mock("mongoose", () => ({ default: mockMongoose }));
vi.mock("server-only", () => ({}));

import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../src/lib/mongodb.js";

describe("isDatabaseConnectionError", () => {
  it("recognizes MongooseServerSelectionError", () => {
    const error = new Error("Server selection timed out");
    error.name = "MongooseServerSelectionError";
    expect(isDatabaseConnectionError(error)).toBe(true);
  });

  it("recognizes MongoServerSelectionError", () => {
    const error = new Error("No server available");
    error.name = "MongoServerSelectionError";
    expect(isDatabaseConnectionError(error)).toBe(true);
  });

  it("recognizes MongoNetworkError and MongoNetworkTimeoutError", () => {
    const netErr = new Error("Socket reset");
    netErr.name = "MongoNetworkError";
    expect(isDatabaseConnectionError(netErr)).toBe(true);

    const timeoutErr = new Error("Timed out");
    timeoutErr.name = "MongoNetworkTimeoutError";
    expect(isDatabaseConnectionError(timeoutErr)).toBe(true);
  });

  it("recognizes Mongoose buffering timeout errors", () => {
    const bufferErr = new Error(
      "Operation `courses.find()` buffering timed out after 10000ms",
    );
    bufferErr.name = "MongooseError";
    expect(isDatabaseConnectionError(bufferErr)).toBe(true);
  });

  it("returns false for application and validation errors", () => {
    const valErr = new Error("Validation failed");
    valErr.name = "ValidationError";
    expect(isDatabaseConnectionError(valErr)).toBe(false);

    const typeErr = new TypeError("Cannot read properties of undefined");
    expect(isDatabaseConnectionError(typeErr)).toBe(false);

    expect(isDatabaseConnectionError(null)).toBe(false);
  });
});

describe("connectToDatabase", () => {
  const originalUri = process.env.MONGODB_URI;

  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mongooseConnection) {
      globalThis.mongooseConnection.connection = null;
      globalThis.mongooseConnection.promise = null;
    }
    mockMongoose.connection.readyState = 0;
  });

  it("throws an error if MONGODB_URI is not set", async () => {
    delete process.env.MONGODB_URI;
    await expect(connectToDatabase()).rejects.toThrow(
      "MONGODB_URI is not configured",
    );
    process.env.MONGODB_URI = originalUri;
  });

  it("throws an error if MONGODB_URI does not start with mongodb:// or mongodb+srv://", async () => {
    process.env.MONGODB_URI = "http://localhost:27017";
    await expect(connectToDatabase()).rejects.toThrow(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    );
    process.env.MONGODB_URI = originalUri;
  });

  it("initiates connection and caches it when connected", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    mockMongoose.connect.mockImplementation(async () => {
      mockMongoose.connection.readyState = 1;
      return mockMongoose;
    });

    const conn1 = await connectToDatabase();
    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
    expect(conn1).toBe(mockMongoose);

    // Second call should reuse active connection without reconnecting
    const conn2 = await connectToDatabase();
    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
    expect(conn2).toBe(mockMongoose);
  });

  it("reconnects if cached connection became disconnected (readyState === 0)", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    mockMongoose.connect.mockImplementation(async () => {
      mockMongoose.connection.readyState = 1;
      return mockMongoose;
    });

    await connectToDatabase();
    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);

    // Simulate connection drop
    mockMongoose.connection.readyState = 0;

    await connectToDatabase();
    expect(mockMongoose.connect).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent connection attempts onto a single promise", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";

    let resolveConnect;
    mockMongoose.connect.mockReturnValue(
      new Promise((resolve) => {
        mockMongoose.connection.readyState = 2; // connecting
        resolveConnect = () => {
          mockMongoose.connection.readyState = 1;
          resolve(mockMongoose);
        };
      }),
    );

    const call1 = connectToDatabase();
    const call2 = connectToDatabase();
    const call3 = connectToDatabase();

    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);

    resolveConnect();
    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

    expect(res1).toBe(mockMongoose);
    expect(res2).toBe(mockMongoose);
    expect(res3).toBe(mockMongoose);
    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("resets cached promise on connection failure so subsequent attempts can retry", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    mockMongoose.connect.mockRejectedValueOnce(
      new Error("Server selection timeout"),
    );

    await expect(connectToDatabase()).rejects.toThrow(
      "Server selection timeout",
    );

    // Second attempt should try connecting again, not return the rejected promise
    mockMongoose.connect.mockImplementationOnce(async () => {
      mockMongoose.connection.readyState = 1;
      return mockMongoose;
    });

    const conn = await connectToDatabase();
    expect(conn).toBe(mockMongoose);
    expect(mockMongoose.connect).toHaveBeenCalledTimes(2);
  });
});
