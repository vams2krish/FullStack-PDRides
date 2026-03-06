import express from 'express';
import { sendOTP, verifyOTP, logout, validateToken, completeLogin, needsOnboarding } from '../services/otp.js';
import User from '../models/User.js';

const router = express.Router();

// Request OTP for login/registration
router.post('/request-otp', async (req, res) => {
  try {
    const { phoneNumber, role, driverData } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    // Validate phone number format
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format' 
      });
    }
    
    // Default to passenger role if not specified
    const userRole = role || 'passenger';
    
    const result = await sendOTP(phoneNumber, userRole, driverData);
    
    if (result.success) {
      // Always include OTP in response for testing purposes
      res.json({
        success: true,
        message: result.message,
        isNewUser: result.isNewUser,
        otp: result.otp
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in request-otp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send OTP' 
    });
  }
});

// Verify OTP and login/register
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otpCode, name } = req.body;
    
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and OTP code are required' 
      });
    }
    
    // Verify OTP
    const result = await verifyOTP(phoneNumber, otpCode);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    // If new user and name provided, complete registration
    if (result.isNewUser && name) {
      const user = await User.findOne({ phoneNumber });
      if (user) {
        user.name = name;
        user.onboardingComplete = true;
        await user.save();
        result.user.name = name;
        result.user.onboardingComplete = true;
      }
    }
    
    // Complete login and generate token
    const user = await User.findOne({ phoneNumber });
    const loginResult = await completeLogin(user);
    
    res.json({
      success: true,
      message: result.message,
      isNewUser: result.isNewUser,
      token: loginResult.token,
      expiresAt: loginResult.expiresAt,
      user: loginResult.user
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify OTP' 
    });
  }
});

// Complete registration with name (after OTP verification)
router.post('/complete-registration', async (req, res) => {
  try {
    const { phoneNumber, name, token } = req.body;
    
    if (!phoneNumber || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and name are required' 
      });
    }
    
    // Validate token
    if (token) {
      const tokenValidation = await validateToken(phoneNumber, token);
      if (!tokenValidation.valid) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired session' 
        });
      }
    }
    
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.name = name;
    user.onboardingComplete = true;
    await user.save();
    
    res.json({
      success: true,
      message: 'Registration completed successfully',
      user: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        isVerified: user.isVerified,
        onboardingComplete: user.onboardingComplete,
        rating: user.rating,
        rideCount: user.rideCount
      }
    });
  } catch (error) {
    console.error('Error in complete-registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete registration' 
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    const result = await logout(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to logout' 
    });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const { phoneNumber, token } = req.query;
    
    if (!phoneNumber || !token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and token are required' 
      });
    }
    
    const validation = await validateToken(phoneNumber, token);
    
    if (!validation.valid) {
      return res.status(401).json({ 
        success: false, 
        error: validation.error || 'Invalid session' 
      });
    }
    
    res.json({
      success: true,
      user: validation.user
    });
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user info' 
    });
  }
});

// Check if user needs onboarding
router.get('/check-onboarding', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    const result = await needsOnboarding(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error in check-onboarding:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check onboarding status' 
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    const result = await sendOTP(phoneNumber);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'OTP resent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in resend-otp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend OTP' 
    });
  }
});

export default router;

