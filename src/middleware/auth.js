/**
 * Authentication Middleware
 * Handles token validation and user authentication
 */

import { validateToken } from '../services/otp.js';
import User from '../models/User.js';

/**
 * Authentication middleware - requires valid token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get credentials from headers or query params
    const phoneNumber = req.headers.phonenumber || req.query.phonenumber;
    const token = req.headers.token || req.query.token;

    // Also check for different casing
    const phoneNumberAlt = req.headers.phoneNumber || req.headers.PhoneNumber;
    const tokenAlt = req.headers.Token || req.headers.authorization?.replace('Bearer ', '');

    const finalPhone = phoneNumber || phoneNumberAlt;
    const finalToken = token || tokenAlt;

    if (!finalPhone || !finalToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide phone number and token.'
      });
    }

    // Validate token
    const validation = await validateToken(finalPhone, finalToken);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: validation.error || 'Invalid or expired session'
      });
    }

    // Attach user info to request
    req.phoneNumber = finalPhone;
    req.user = validation.user;
    req.token = finalToken;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Get credentials
    const phoneNumber = req.headers.phonenumber || req.query.phonenumber;
    const token = req.headers.token || req.query.token;

    const phoneNumberAlt = req.headers.phoneNumber || req.headers.PhoneNumber;
    const tokenAlt = req.headers.Token || req.headers.authorization?.replace('Bearer ', '');

    const finalPhone = phoneNumber || phoneNumberAlt;
    const finalToken = token || tokenAlt;

    // If no credentials, continue without auth
    if (!finalPhone || !finalToken) {
      req.authenticated = false;
      return next();
    }

    // Validate token
    const validation = await validateToken(finalPhone, finalToken);

    if (validation.valid) {
      req.phoneNumber = finalPhone;
      req.user = validation.user;
      req.token = finalToken;
      req.authenticated = true;
    } else {
      req.authenticated = false;
    }

    next();
  } catch (error) {
    // Continue without auth on error
    req.authenticated = false;
    next();
  }
};

/**
 * Admin check middleware - requires admin role
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.phoneNumber) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

/**
 * Rate limiting helper
 */
export const rateLimit = {
  requests: new Map(),
  
  check(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    const record = this.requests.get(key);
    
    if (now > record.resetTime) {
      // Reset
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    if (record.count >= maxRequests) {
      return { 
        allowed: false, 
        remaining: 0,
        resetIn: Math.round((record.resetTime - now) / 1000)
      };
    }
    
    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
  },
  
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
};

// Cleanup rate limit map every 5 minutes
setInterval(() => rateLimit.cleanup(), 5 * 60 * 1000);

/**
 * Rate limit middleware
 */
export const rateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const result = rateLimit.check(identifier, maxRequests, windowMs);
    
    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${result.resetIn} seconds.`
      });
    }
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', result.remaining);
    
    next();
  };
};

export default {
  authenticate,
  optionalAuth,
  requireAdmin,
  rateLimitMiddleware
};

