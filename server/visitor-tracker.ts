import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';
// Import geoip with proper error handling
let geoip: any = null;
let geoipAvailable = false;
try {
  geoip = require('geoip-lite');
  geoipAvailable = true;
} catch (error) {
  // geoip-lite not available, will use fallback
}
import { randomBytes } from 'node:crypto';
import { storage } from './storage';
import type { InsertVisitorLog } from '@shared/schema';

// Session tracking
const sessions = new Map<string, string>();

// Get client IP address (handles proxies)
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
  
  // Clean up IPv6 mapped IPv4 addresses
  if (clientIp && clientIp.startsWith('::ffff:')) {
    return clientIp.substring(7);
  }
  
  return clientIp || 'unknown';
}

// Generate session ID
function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

// Get or create session
function getSession(req: Request): string {
  const sessionCookie = req.headers.cookie?.split(';')
    .find(c => c.trim().startsWith('session_id='))
    ?.split('=')[1];
    
  if (sessionCookie && sessions.has(sessionCookie)) {
    return sessionCookie;
  }
  
  const newSessionId = generateSessionId();
  sessions.set(newSessionId, 'active');
  return newSessionId;
}

// Parse user agent
function parseUserAgent(userAgent: string) {
  const parser = new UAParser();
  const result = parser.setUA(userAgent).getResult();
  
  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    operatingSystem: result.os.name && result.os.version 
      ? `${result.os.name} ${result.os.version}` 
      : result.os.name || 'Unknown'
  };
}

// Get location from IP
function getLocationFromIp(ip: string) {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local/Private Network',
      region: 'Local',
      city: 'Local',
      latitude: null,
      longitude: null,
      timezone: null,
      isp: 'Local Network'
    };
  }
  
  let geo = null;
  if (geoipAvailable && geoip && typeof geoip.lookup === 'function') {
    try {
      geo = geoip.lookup(ip);
    } catch (error) {
      // Geoip lookup failed, will use fallback
    }
  }
  
  if (!geo) {
    return {
      country: 'Unknown',
      region: 'Unknown', 
      city: 'Unknown',
      latitude: null,
      longitude: null,
      timezone: null,
      isp: 'Unknown'
    };
  }
  
  return {
    country: geo.country || 'Unknown',
    region: geo.region || 'Unknown',
    city: geo.city || 'Unknown',
    latitude: geo.ll?.[0]?.toString() || null,
    longitude: geo.ll?.[1]?.toString() || null,
    timezone: geo.timezone || null,
    isp: 'Unknown' // geoip-lite doesn't provide ISP info
  };
}

// Store recent sessions in memory to avoid duplicate tracking
const recentSessions = new Map<string, number>();

// Clean up old sessions every 30 minutes
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [sessionId, timestamp] of recentSessions.entries()) {
    if (now - timestamp > thirtyMinutes) {
      recentSessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

// Export cleanup function for graceful shutdown
export function cleanupSessionTracker() {
  if (sessionCleanupInterval) {
    clearInterval(sessionCleanupInterval);
  }
}

// Visitor tracking middleware
export async function trackVisitor(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip tracking for API routes, static assets, WebSocket upgrades, and Vite dev assets
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/assets/') || 
        req.path.startsWith('/@vite/') ||
        req.path.startsWith('/@react-refresh') ||
        req.path.includes('.') ||
        req.headers.upgrade === 'websocket') {
      return next();
    }
    
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = getSession(req);
    const { browser, browserVersion, operatingSystem } = parseUserAgent(userAgent);
    const location = getLocationFromIp(ipAddress);
    
    // Check if this session was already tracked recently (within 30 minutes)
    const lastTracked = recentSessions.get(sessionId);
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    if (lastTracked && (now - lastTracked) < thirtyMinutes) {
      // Skip tracking if same session within 30 minutes
      return next();
    }

    // Update the session timestamp
    recentSessions.set(sessionId, now);
    
    const visitorLog: InsertVisitorLog = {
      ipAddress,
      userAgent,
      browser,
      browserVersion,
      operatingSystem,
      country: location.country,
      region: location.region,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      isp: location.isp,
      visitedPage: req.originalUrl || req.path,
      referrer: req.headers.referer || null,
      sessionId,
    };
    
    // Save visitor log asynchronously (don't block request)
    storage.createVisitorLog(visitorLog).then((savedVisitor) => {
      // Broadcast the new visitor update in real-time
      const broadcastVisitorUpdate = (global as any).broadcastVisitorUpdate;
      if (broadcastVisitorUpdate) {
        broadcastVisitorUpdate(savedVisitor);
      }
    }).catch(error => {
      console.error('Failed to save visitor log:', error);
    });
    
    // Set session cookie if not exists
    if (!req.headers.cookie?.includes('session_id=')) {
      res.cookie('session_id', sessionId, { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
      });
    }
    
  } catch (error) {
    console.error('Visitor tracking error:', error instanceof Error ? error.message : error);
  }
  
  next();
}

// Clean up old sessions (optional cleanup function)
export function cleanupSessions() {
  // This could be called periodically to clean up old sessions
  // For now, we'll just keep them in memory
}