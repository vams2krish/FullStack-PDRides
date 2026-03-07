/**
 * Database Service Module
 * Handles MongoDB connection, monitoring, and utilities
 */

import mongoose from 'mongoose';

const DB_CONFIG = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4
};

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 5000;

/**
 * Get MongoDB URI from environment or use default
 */
export const getMongoURI = () => {
  // Check for various environment variables
  const uri = process.env.MONGODB_URI || 
              process.env.MONGO_URI || 
              process.env.MONGODB_URL ||
              'mongodb://localhost:27017/pdrides';
  
  // Add options to URI if not present
  if (!uri.includes('?')) {
    const options = [
      'maxPoolSize=10',
      'minPoolSize=2',
      'socketTimeoutMS=45000'
    ].join('&');
    return `${uri}?${options}`;
  }
  
  return uri;
};

/**
 * Connect to MongoDB with retry logic
 */
export const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✓ Using existing MongoDB connection');
    return true;
  }

  try {
    connectionAttempts++;
    const uri = getMongoURI();
    
    console.log(`\n📡 Connecting to MongoDB (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})...`);
    console.log(`   URI: ${uri.replace(/\/\/.*:.*@/, '//****:****@')}`);
    
    const options = {
      ...DB_CONFIG,
      dbName: process.env.MONGODB_DATABASE || 'pdrides'
    };

    await mongoose.connect(uri, options);
    
    isConnected = true;
    connectionAttempts = 0;
    
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    
    // Setup event listeners
    setupConnectionListeners();
    
    // Create indexes
    await createIndexes();
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      console.log(`⏳ Retrying in ${RETRY_INTERVAL_MS / 1000} seconds...`);
      setTimeout(connectDB, RETRY_INTERVAL_MS);
    } else {
      console.error('💥 Max connection attempts reached. Exiting...');
      process.exit(1);
    }
    
    return false;
  }
};

/**
 * Setup MongoDB connection event listeners
 */
const setupConnectionListeners = () => {
  const connection = mongoose.connection;
  
  // Connection events
  connection.on('connected', () => {
    console.log('📡 MongoDB: Connected event');
    isConnected = true;
  });

  connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB: Disconnected');
    isConnected = false;
  });

  connection.on('error', (err) => {
    console.error('💥 MongoDB Error:', err.message);
  });

  connection.on('reconnected', () => {
    console.log('📡 MongoDB: Reconnected');
    isConnected = true;
  });

  connection.on('close', () => {
    console.log('📡 MongoDB: Connection closed');
    isConnected = false;
  });
};

/**
 * Create database indexes for performance
 */
export const createIndexes = async () => {
  console.log('\n📊 Creating database indexes...');
  
  try {
    const User = (await import('../models/User.js')).default;
    const Ride = (await import('../models/Ride.js')).default;
    const Conversation = (await import('../models/Conversation.js')).default;

    // User indexes
    await User.createIndexes();
    console.log('   ✓ User indexes created');

    // Ride indexes
    await Ride.createIndexes();
    console.log('   ✓ Ride indexes created');

    // Conversation indexes
    await Conversation.createIndexes();
    console.log('   ✓ Conversation indexes created');

    console.log('📊 All indexes created successfully\n');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting:', error);
  }
};

/**
 * Get connection status
 */
export const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[state] || 'unknown',
    isConnected: state === 1,
    database: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port
  };
};

/**
 * Ping database to check connection
 */
export const pingDB = async () => {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - start;
    
    return {
      success: true,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get database statistics
 */
export const getDBStats = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const stats = await admin.serverStatus();
    
    return {
      success: true,
      stats: {
        version: stats.version,
        uptime: stats.uptime,
        connections: {
          current: stats.connections.current,
          available: stats.connections.available,
          totalCreated: stats.connections.totalCreated
        },
        memory: {
          resident: `${Math.round(stats.mem.resident / 1024)}MB`,
          virtual: `${Math.round(stats.mem.virtual / 1024)}MB`
        },
        operations: {
          inserts: stats.opcounters?.insert || 0,
          queries: stats.opcounters?.query || 0,
          updates: stats.opcounters?.update || 0,
          deletes: stats.opcounters?.delete || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Aggregate collection statistics
 */
export const getCollectionStats = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const stats = {};
    for (const coll of collections) {
      const collStats = await db.collection(coll.name).stats();
      stats[coll.name] = {
        documents: collStats.count,
        size: formatBytes(collStats.size),
        avgDocSize: formatBytes(collStats.avgObjSize),
        indexes: collStats.nIndexes,
        indexSize: formatBytes(collStats.indexSize)
      };
    }
    
    return { success: true, collections: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Health check function for monitoring
 */
export const healthCheck = async () => {
  const connectionStatus = getConnectionStatus();
  const ping = await pingDB();
  
  return {
    status: connectionStatus.isConnected ? 'healthy' : 'unhealthy',
    connection: connectionStatus,
    ping: ping,
    timestamp: new Date().toISOString()
  };
};

export default {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  pingDB,
  getDBStats,
  getCollectionStats,
  healthCheck,
  createIndexes
};

