import crypto from 'crypto';
import User from '../models/User.js';
import { sendTextMessage } from './whatsapp.js';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP to user via WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @param {string} role - User role: 'passenger' or 'driver'
 * @param {Object} driverData - Driver registration data (if registering as driver)
 * @returns {Object} Result with success status and message
 */
export async function sendOTP(phoneNumber, role = 'passenger', driverData = null) {
  try {
    const user = await User.findOne({ phoneNumber });
    
    // Check if user exists and can request OTP
    if (!user) {
      // Create new user for registration
      const newUserData = { 
        phoneNumber,
        verificationCode: generateOTP(),
        verificationExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        lastOTPRequest: new Date(),
        otpAttempts: 0,
        roles: {
          passenger: role !== 'driver',
          driver: role === 'driver'
        }
      };

      // If registering as driver, add driver info
      if (role === 'driver' && driverData) {
        newUserData.driverInfo = {
          isDriver: true,
          vehicleMake: driverData.vehicleMake || '',
          vehicleModel: driverData.vehicleModel || '',
          vehicleYear: driverData.vehicleYear || '',
          vehicleColor: driverData.vehicleColor || '',
          licensePlate: driverData.licensePlate || '',
          isDriverVerified: false,
          driverSince: new Date(),
          totalTrips: 0
        };
        newUserData.name = driverData.name || '';
      }

      const newUser = new User(newUserData);
      await newUser.save();
      
      // Try to send OTP via WhatsApp, but don't fail if it doesn't work
      let otpSent = false;
      try {
        await sendOTPMessage(phoneNumber, newUser.verificationCode);
        otpSent = true;
      } catch (whatsappError) {
        console.error('WhatsApp send failed for new user:', whatsappError.message);
      }
      
      // Return success - if WhatsApp failed, include OTP in response
      if (!otpSent) {
        return { 
          success: true, 
          isNewUser: true,
          message: 'OTP generated (WhatsApp failed - code in response)',
          otp: newUser.verificationCode
        };
      }
      
      // Always return OTP for testing purposes
      return { 
        success: true, 
        isNewUser: true,
        message: 'OTP sent for registration',
        otp: newUser.verificationCode
      };
    }
    
    // Check rate limiting (max 3 OTPs per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = user.lastOTPRequest && user.lastOTPRequest > oneHourAgo;
    
    if (recentRequests && user.otpAttempts >= 3) {
      return { 
        success: false, 
        error: 'Too many OTP requests. Please try again in 1 hour.' 
      };
    }
    
    // Generate new OTP
    const otp = generateOTP();
    user.verificationCode = otp;
    user.verificationExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.lastOTPRequest = new Date();
    
    // Reset attempts if last request was over an hour ago
    if (!recentRequests) {
      user.otpAttempts = 0;
    }
    
    await user.save();
    
    // Try to send OTP via WhatsApp, but don't fail if it doesn't work
    let otpSent = false;
    try {
      await sendOTPMessage(phoneNumber, otp);
      otpSent = true;
    } catch (whatsappError) {
      console.error('WhatsApp send failed, returning OTP in response:', whatsappError.message);
    }
    
    // Return success - if WhatsApp failed, include OTP in response for testing
    if (!otpSent) {
      return { 
        success: true, 
        isNewUser: false,
        message: 'OTP generated (WhatsApp failed - see console/response for code)',
        otp: otp // For testing when WhatsApp is not working
      };
    }
    
    // Always return OTP for testing purposes
    return { 
      success: true, 
      isNewUser: false,
      message: 'OTP sent successfully',
      otp: otp
    };
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { 
      success: false, 
      error: 'Failed to send OTP. Please try again.' 
    };
  }
}

/**
 * Verify OTP code
 * @param {string} phoneNumber - User's phone number
 * @param {string} otpCode - OTP code entered by user
 * @returns {Object} Result with success status and user info
 */
export async function verifyOTP(phoneNumber, otpCode) {
  try {
    const user = await User.findOne({ phoneNumber });
    
    if (!user) {
      return { 
        success: false, 
        error: 'User not found. Please request a new OTP.' 
      };
    }
    
    // Check if OTP exists and is not expired (separate from attempt checking)
    if (!user.verificationCode || !user.verificationExpiry) {
      return { 
        success: false, 
        error: 'No OTP found. Please request a new OTP.' 
      };
    }
    
    // Check if OTP has expired
    if (new Date() > user.verificationExpiry) {
      await user.incrementOTPAttempts();
      return { 
        success: false, 
        error: 'OTP has expired. Please request a new OTP.' 
      };
    }
    
    // Check attempts (separate from expiry check)
    if (user.otpAttempts >= 3) {
      return { 
        success: false, 
        error: 'Too many failed attempts. Please request a new OTP.' 
      };
    }
    
    // Verify OTP code
    if (user.verificationCode !== otpCode) {
      await user.incrementOTPAttempts();
      
      const attemptsLeft = 3 - user.otpAttempts;
      if (attemptsLeft <= 0) {
        await user.resetOTPAttempts();
        return { 
          success: false, 
          error: 'Too many failed attempts. Please request a new OTP.' 
        };
      }
      
      return { 
        success: false, 
        error: `Incorrect OTP. ${attemptsLeft} attempts remaining.` 
      };
    }
    
    // OTP verified successfully
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpiry = null;
    user.otpAttempts = 0;
    user.lastLogin = new Date();
    await user.save();
    
    return { 
      success: true, 
      user: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        isVerified: user.isVerified,
        onboardingComplete: user.onboardingComplete
      },
      message: 'Phone number verified successfully!' 
    };
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { 
      success: false, 
      error: 'Failed to verify OTP. Please try again.' 
    };
  }
}

/**
 * Send OTP message via WhatsApp
 */
async function sendOTPMessage(phoneNumber, otp) {
  const message = `🔐 *PDRides Verification Code*\n\n` +
    `Your verification code is: *${otp}*\n\n` +
    `This code will expire in 5 minutes.\n` +
    `If you didn't request this, please ignore.`;
  
  await sendTextMessage(phoneNumber, message);
}

/**
 * Request login with OTP (for existing users)
 */
export async function requestLoginOTP(phoneNumber) {
  return sendOTP(phoneNumber);
}

/**
 * Complete login after OTP verification
 */
export async function completeLogin(user) {
  // Generate session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
  user.loginToken = sessionToken;
  user.loginTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await user.save();
  
  return {
    token: sessionToken,
    expiresAt: user.loginTokenExpiry,
    user: {
      phoneNumber: user.phoneNumber,
      name: user.name,
      isVerified: user.isVerified,
      onboardingComplete: user.onboardingComplete,
      rating: user.rating,
      rideCount: user.rideCount
    }
  };
}

/**
 * Logout user
 */
export async function logout(phoneNumber) {
  const user = await User.findOne({ phoneNumber });
  if (user) {
    user.loginToken = null;
    user.loginTokenExpiry = null;
    await user.save();
  }
  return { success: true, message: 'Logged out successfully' };
}

/**
 * Validate session token
 */
export async function validateToken(phoneNumber, token) {
  const user = await User.findOne({ phoneNumber });
  
  if (!user || !user.loginToken || !user.loginTokenExpiry) {
    return { valid: false };
  }
  
  if (new Date() > user.loginTokenExpiry) {
    return { valid: false, error: 'Session expired' };
  }
  
  if (user.loginToken !== token) {
    return { valid: false, error: 'Invalid token' };
  }
  
  return { 
    valid: true, 
    user: {
      phoneNumber: user.phoneNumber,
      name: user.name,
      isVerified: user.isVerified,
      onboardingComplete: user.onboardingComplete,
      rating: user.rating,
      rideCount: user.rideCount
    }
  };
}

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(phoneNumber) {
  const user = await User.findOne({ phoneNumber });
  
  if (!user) {
    return { needsOnboarding: true, reason: 'new_user' };
  }
  
  if (!user.isVerified) {
    return { needsOnboarding: true, reason: 'not_verified' };
  }
  
  if (!user.onboardingComplete) {
    return { needsOnboarding: true, reason: 'onboarding_incomplete' };
  }
  
  return { needsOnboarding: false };
}

