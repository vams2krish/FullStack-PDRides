/**
 * User Service
 * Business logic for user management
 */

import User from '../models/User.js';
import { generateOTP, verifyOTP as verifyOTPLogic } from './otp.js';

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  const { phoneNumber, name, email, role } = userData;

  // Check if user exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    // Check if verified
    if (existingUser.isVerified) {
      throw new Error('User already exists');
    }
    // Update unverified user
    existingUser.name = name || existingUser.name;
    existingUser.email = email || existingUser.email;
    if (role === 'driver') {
      existingUser.roles = { passenger: true, driver: true };
      existingUser.driverInfo = {
        isDriver: true,
        driverSince: new Date()
      };
    }
    await existingUser.save();
    return existingUser;
  }

  // Create new user
  const user = new User({
    phoneNumber,
    name: name || '',
    email: email || '',
    roles: {
      passenger: true,
      driver: role === 'driver'
    },
    driverInfo: role === 'driver' ? {
      isDriver: true,
      driverSince: new Date(),
      totalTrips: 0
    } : undefined
  });

  await user.save();
  return user;
};

/**
 * Get user by phone number
 */
export const getUserByPhone = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Get user profile with all details
 */
export const getUserProfile = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  return {
    phoneNumber: user.phoneNumber,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    rating: user.rating,
    totalRatings: user.totalRatings,
    rideCount: user.rideCount,
    createdAt: user.createdAt,
    lastActive: user.lastActive,
    preferences: user.preferences,
    roles: user.roles,
    driverInfo: user.driverInfo,
    emergencyContact: user.emergencyContact,
    privacySettings: user.privacySettings,
    notificationSettings: user.notificationSettings,
    recentSearches: user.recentSearches,
    favoriteRoutes: user.favoriteRoutes
  };
};

/**
 * Update user profile
 */
export const updateProfile = async (phoneNumber, updateData) => {
  const { name, email, preferences, emergencyContact } = updateData;

  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }
  if (emergencyContact) {
    user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };
  }

  await user.save();
  return user;
};

/**
 * Update driver information
 */
export const updateDriverInfo = async (phoneNumber, driverData) => {
  const {
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    licensePlate,
    isDriver
  } = driverData;

  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  // Initialize driverInfo if needed
  if (!user.driverInfo) {
    user.driverInfo = {};
  }

  // Update fields
  if (vehicleMake !== undefined) user.driverInfo.vehicleMake = vehicleMake;
  if (vehicleModel !== undefined) user.driverInfo.vehicleModel = vehicleModel;
  if (vehicleYear !== undefined) user.driverInfo.vehicleYear = vehicleYear;
  if (vehicleColor !== undefined) user.driverInfo.vehicleColor = vehicleColor;
  if (licensePlate !== undefined) user.driverInfo.licensePlate = licensePlate;
  if (isDriver !== undefined) {
    user.driverInfo.isDriver = isDriver;
    if (isDriver && !user.driverInfo.driverSince) {
      user.driverInfo.driverSince = new Date();
    }
  }

  // Update roles
  if (!user.roles) {
    user.roles = { passenger: true, driver: false };
  }
  user.roles.driver = isDriver;

  await user.save();
  return user;
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (phoneNumber, settings) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.privacySettings) {
    user.privacySettings = {};
  }

  Object.assign(user.privacySettings, settings);
  await user.save();
  return user.privacySettings;
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (phoneNumber, settings) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.notificationSettings) {
    user.notificationSettings = {};
  }

  Object.assign(user.notificationSettings, settings);
  await user.save();
  return user.notificationSettings;
};

/**
 * Add recent search
 */
export const addRecentSearch = async (phoneNumber, searchData) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  await user.addRecentSearch(searchData);
  return user.recentSearches;
};

/**
 * Add favorite route
 */
export const addFavoriteRoute = async (phoneNumber, routeData) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  // Check limit
  if (user.favoriteRoutes.length >= 20) {
    throw new Error('Maximum favorite routes limit reached (20)');
  }

  await user.addFavoriteRoute(routeData);
  return user.favoriteRoutes;
};

/**
 * Remove favorite route
 */
export const removeFavoriteRoute = async (phoneNumber, routeId) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  await user.removeFavoriteRoute(routeId);
  return user.favoriteRoutes;
};

/**
 * Update user rating
 */
export const updateUserRating = async (phoneNumber, newRating) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  await user.updateRating(newRating);
  return { rating: user.rating, totalRatings: user.totalRatings };
};

/**
 * Delete user account
 */
export const deleteAccount = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  // Check for active rides
  const Ride = (await import('../models/Ride.js')).default;
  const activeRides = await Ride.countDocuments({
    $or: [
      { driverPhone: phoneNumber, status: { $in: ['active', 'full'] } },
      { 'passengers.phone': phoneNumber, status: { $in: ['active', 'full'] } }
    ],
    expiresAt: { $gt: new Date() }
  });

  if (activeRides > 0) {
    throw new Error(`Cannot delete account with ${activeRides} active rides`);
  }

  await User.findOneAndDelete({ phoneNumber });
  return { success: true };
};

/**
 * Schedule account deletion
 */
export const scheduleAccountDeletion = async (phoneNumber, days = 60) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  user.accountDeletionScheduled = true;
  user.scheduledDeletionDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  user.isActive = false;

  await user.save();
  return {
    scheduledDeletionDate: user.scheduledDeletionDate,
    message: `Account will be deleted in ${days} days`
  };
};

/**
 * Cancel scheduled deletion
 */
export const cancelAccountDeletion = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new Error('User not found');
  }

  user.accountDeletionScheduled = false;
  user.scheduledDeletionDate = null;
  user.isActive = true;

  await user.save();
  return { success: true, message: 'Account deletion cancelled' };
};

/**
 * Get users by role
 */
export const getUsersByRole = async (role, options = {}) => {
  const { page = 1, limit = 20 } = options;

  const query = role === 'driver'
    ? { 'driverInfo.isDriver': true }
    : { 'roles.passenger': true };

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  return {
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
};

/**
 * Search users
 */
export const searchUsers = async (query, options = {}) => {
  const { page = 1, limit = 20 } = options;

  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { phoneNumber: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
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
};

/**
 * Get platform statistics
 */
export const getPlatformStats = async () => {
  const [
    totalUsers,
    verifiedUsers,
    totalDrivers,
    totalRides
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ 'driverInfo.isDriver': true }),
    (await import('../models/Ride.js')).default.countDocuments()
  ]);

  return {
    totalUsers,
    verifiedUsers,
    totalDrivers,
    totalRides,
    driverPercentage: totalUsers > 0 ? ((totalDrivers / totalUsers) * 100).toFixed(1) : 0
  };
};

export default {
  registerUser,
  getUserByPhone,
  getUserProfile,
  updateProfile,
  updateDriverInfo,
  updatePrivacySettings,
  updateNotificationSettings,
  addRecentSearch,
  addFavoriteRoute,
  removeFavoriteRoute,
  updateUserRating,
  deleteAccount,
  scheduleAccountDeletion,
  cancelAccountDeletion,
  getUsersByRole,
  searchUsers,
  getPlatformStats
};

