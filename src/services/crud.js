/**
 * CRUD Service Layer
 * Provides unified database operations for all models
 */

import User from '../models/User.js';
import Ride from '../models/Ride.js';
import Conversation from '../models/Conversation.js';

// ============================================
// USER CRUD OPERATIONS
// ============================================

export const userCrud = {
  /**
   * Create a new user
   */
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    return await User.findById(id);
  },

  /**
   * Find user by phone number
   */
  async findByPhone(phoneNumber) {
    return await User.findOne({ phoneNumber });
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  },

  /**
   * Find user by login token
   */
  async findByToken(token) {
    return await User.findOne({ 
      loginToken: token,
      loginTokenExpiry: { $gt: new Date() }
    });
  },

  /**
   * Get all users with pagination
   */
  async findAll(options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    
    const users = await User.find()
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments();
    
    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Update user
   */
  async update(id, updateData) {
    return await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  },

  /**
   * Update user by phone
   */
  async updateByPhone(phoneNumber, updateData) {
    return await User.findOneAndUpdate(
      { phoneNumber },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  },

  /**
   * Delete user
   */
  async delete(id) {
    return await User.findByIdAndDelete(id);
  },

  /**
   * Delete user by phone
   */
  async deleteByPhone(phoneNumber) {
    return await User.findOneAndDelete({ phoneNumber });
  },

  /**
   * Find verified users
   */
  async findVerified() {
    return await User.find({ isVerified: true });
  },

  /**
   * Find users by role
   */
  async findByRole(role) {
    const query = role === 'driver' 
      ? { 'driverInfo.isDriver': true }
      : { 'roles.passenger': true };
    return await User.find(query);
  },

  /**
   * Count users
   */
  async count(filters = {}) {
    return await User.countDocuments(filters);
  },

  /**
   * Search users by name or phone
   */
  async search(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } }
      ]
    };
    
    const users = await User.find(searchQuery)
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(searchQuery);
    
    return {
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
};

// ============================================
// RIDE CRUD OPERATIONS
// ============================================

export const rideCrud = {
  /**
   * Create a new ride
   */
  async create(rideData) {
    const ride = new Ride(rideData);
    return await ride.save();
  },

  /**
   * Find ride by ID
   */
  async findById(id) {
    return await Ride.findById(id);
  },

  /**
   * Find rides by driver
   */
  async findByDriver(driverPhone, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    
    const query = { driverPhone };
    if (status) query.status = status;
    
    const rides = await Ride.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await Ride.countDocuments(query);
    
    return {
      data: rides,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Find rides by passenger
   */
  async findByPassenger(passengerPhone, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    
    const query = { 'passengers.phone': passengerPhone };
    if (status) query.status = status;
    
    const rides = await Ride.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await Ride.countDocuments(query);
    
    return {
      data: rides,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Get all rides with filters
   */
  async findAll(filters = {}, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'date',
      order = 'asc'
    } = options;
    
    const query = { ...filters };
    
    // Add expiration filter
    if (filters.active !== false) {
      query.expiresAt = { $gt: new Date() };
      query.status = { $in: ['active', 'full'] };
    }
    
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    
    const rides = await Ride.find(query)
      .sort(sortObj)
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await Ride.countDocuments(query);
    
    return {
      data: rides,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Search rides by location
   */
  async searchByLocation(pickup, destination, options = {}) {
    const { date, seats = 1, page = 1, limit = 20 } = options;
    
    const query = {
      status: 'active',
      expiresAt: { $gt: new Date() },
      availableSeats: { $gte: seats }
    };
    
    // Add date filter if provided
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDay };
    }
    
    // Add location search
    if (pickup || destination) {
      query.$or = [];
      if (pickup) {
        query.$or.push({ pickupLocation: { $regex: pickup, $options: 'i' } });
      }
      if (destination) {
        query.$or.push({ destination: { $regex: destination, $options: 'i' } });
      }
    }
    
    const rides = await Ride.find(query)
      .sort({ date: 1, time: 1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await Ride.countDocuments(query);
    
    return {
      data: rides,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Update ride
   */
  async update(id, updateData) {
    return await Ride.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  },

  /**
   * Update ride status
   */
  async updateStatus(id, status) {
    const validStatuses = ['active', 'full', 'completed', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    return await Ride.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
  },

  /**
   * Add passenger to ride
   */
  async addPassenger(rideId, passengerData) {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error('Ride not found');
    
    return await ride.addPassenger(
      passengerData.phone,
      passengerData.name,
      passengerData.seats || 1
    );
  },

  /**
   * Remove passenger from ride
   */
  async removePassenger(rideId, passengerPhone) {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error('Ride not found');
    
    const passenger = ride.passengers.find(p => p.phone === passengerPhone);
    if (!passenger) throw new Error('Passenger not found');
    
    ride.passengers = ride.passengers.filter(p => p.phone !== passengerPhone);
    ride.availableSeats += passenger.seats;
    
    if (ride.status === 'full') {
      ride.status = 'active';
    }
    
    return await ride.save();
  },

  /**
   * Delete ride
   */
  async delete(id) {
    return await Ride.findByIdAndDelete(id);
  },

  /**
   * Count rides
   */
  async count(filters = {}) {
    return await Ride.countDocuments(filters);
  },

  /**
   * Get ride statistics
   */
  async getStats(driverPhone = null) {
    const query = driverPhone ? { driverPhone } : {};
    
    const [total, active, completed, cancelled] = await Promise.all([
      Ride.countDocuments(query),
      Ride.countDocuments({ ...query, status: 'active' }),
      Ride.countDocuments({ ...query, status: 'completed' }),
      Ride.countDocuments({ ...query, status: 'cancelled' })
    ]);
    
    return { total, active, completed, cancelled };
  },

  /**
   * Get rides expiring soon
   */
  async getExpiringSoon(hours = 24) {
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return await Ride.find({
      status: 'active',
      expiresAt: { $gt: new Date(), $lt: expiresAt }
    });
  },

  /**
   * Mark expired rides
   */
  async markExpired() {
    return await Ride.updateMany(
      { 
        status: { $in: ['active', 'full'] },
        expiresAt: { $lt: new Date() }
      },
      { $set: { status: 'expired' } }
    );
  }
};

// ============================================
// CONVERSATION CRUD OPERATIONS
// ============================================

export const conversationCrud = {
  /**
   * Create a new conversation
   */
  async create(conversationData) {
    const conversation = new Conversation(conversationData);
    return await conversation.save();
  },

  /**
   * Find conversation by phone
   */
  async findByPhone(phoneNumber) {
    return await Conversation.findOne({ phoneNumber });
  },

  /**
   * Find conversation by ID
   */
  async findById(id) {
    return await Conversation.findById(id);
  },

  /**
   * Get all conversations
   */
  async findAll(options = {}) {
    const { page = 1, limit = 20, sort = '-lastActivity' } = options;
    
    const conversations = await Conversation.find()
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit);
    
    const total = await Conversation.countDocuments();
    
    return {
      data: conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  /**
   * Get stale conversations (no activity for X minutes)
   */
  async findStale(minutes = 30) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return await Conversation.find({
      lastActivity: { $lt: cutoff },
      state: { $ne: 'idle' }
    });
  },

  /**
   * Update conversation
   */
  async update(id, updateData) {
    return await Conversation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
  },

  /**
   * Update conversation state
   */
  async updateState(phoneNumber, state, tempData = null) {
    const conversation = await Conversation.findOne({ phoneNumber });
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return await conversation.setState(state, tempData);
  },

  /**
   * Add message to conversation
   */
  async addMessage(phoneNumber, role, message) {
    const conversation = await Conversation.findOne({ phoneNumber });
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return await conversation.addMessage(role, message);
  },

  /**
   * Reset conversation to idle
   */
  async reset(phoneNumber) {
    const conversation = await Conversation.findOne({ phoneNumber });
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return await conversation.reset();
  },

  /**
   * Delete conversation
   */
  async delete(id) {
    return await Conversation.findByIdAndDelete(id);
  },

  /**
   * Delete old conversations
   */
  async deleteOld(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await Conversation.deleteMany({
      lastActivity: { $lt: cutoff },
      state: 'idle'
    });
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Execute a database operation with retry logic
 */
export const withRetry = async (operation, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  }
  throw lastError;
};

/**
 * Execute multiple operations in a transaction
 */
export const transaction = async (operations) => {
  const session = await User.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operations(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Bulk operations
 */
export const bulkOperations = {
  /**
   * Bulk insert rides
   */
  async insertRides(rides) {
    if (!rides.length) return { insertedCount: 0 };
    const result = await Ride.insertMany(rides);
    return { insertedCount: result.length };
  },

  /**
   * Bulk update rides
   */
  async updateRides(updates) {
    if (!updates.length) return { modifiedCount: 0 };
    
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update._id },
        update: { $set: update.data }
      }
    }));
    
    const result = await Ride.bulkWrite(bulkOps);
    return { modifiedCount: result.modifiedCount };
  },

  /**
   * Bulk delete rides
   */
  async deleteRides(ids) {
    if (!ids.length) return { deletedCount: 0 };
    const result = await Ride.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
  }
};

export default {
  userCrud,
  rideCrud,
  conversationCrud,
  withRetry,
  transaction,
  bulkOperations
};

