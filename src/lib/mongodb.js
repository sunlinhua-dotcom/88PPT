import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI 未配置，对话历史将无法持久化存储");
}

let client;
let clientPromise;

if (MONGODB_URI) {
    if (process.env.NODE_ENV === "development") {
        // 开发模式下复用全局连接，避免热更新时重复创建
        if (!global._mongoClientPromise) {
            client = new MongoClient(MONGODB_URI);
            global._mongoClientPromise = client.connect();
        }
        clientPromise = global._mongoClientPromise;
    } else {
        client = new MongoClient(MONGODB_URI);
        clientPromise = client.connect();
    }
}

/**
 * 获取数据库实例
 * @returns {Promise<import("mongodb").Db>}
 */
export async function getDb() {
    if (!clientPromise) {
        throw new Error("MongoDB 未连接：请配置 MONGODB_URI 环境变量");
    }
    const client = await clientPromise;
    return client.db("ppt_ai");
}

/**
 * 获取会话集合
 * @returns {Promise<import("mongodb").Collection>}
 */
export async function getSessionsCollection() {
    const db = await getDb();
    return db.collection("sessions");
}
