require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const emailService = require('./server/utils/emailService');
const proxyRoutes = require('./api/proxy');

// Force development mode for local testing
// Set NODE_ENV=production on your server to use real Firebase Admin
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
console.log(`Running in ${process.env.NODE_ENV} mode`);

// Firebase Admin SDK initialization
let admin;
let db;
let usingMockDatabase = false; // Will stay false no matter what

try {
  // Import Firebase Admin
  admin = require('firebase-admin');
  
  // Initialize Firebase Admin
  try {
    let firebaseConfig;
    let serviceAccount;
    
    // Try loading from serviceAccountKey.json
    try {
      serviceAccount = require('./serviceAccountKey.json');
      
      // Check if private key is a placeholder
      if (serviceAccount.private_key.includes('REPLACE_THIS_WITH_YOUR_ACTUAL_PRIVATE_KEY')) {
        console.log('serviceAccountKey.json contains placeholder values, trying alternative file');
        throw new Error('Private key contains placeholder value');
      }
      
      console.log('Using Firebase service account key from serviceAccountKey.json');
    } catch (error) {
      console.log('Failed to load from serviceAccountKey.json:', error.message);
      
      // Try loading from the alternative key file
      try {
        serviceAccount = require('./src/firebase/new-private-key.json');
        console.log('Using Firebase service account key from src/firebase/new-private-key.json');
      } catch (altError) {
        console.log('Failed to load from alternative key file:', altError.message);
        
        // Fall back to environment variables if available
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
          console.log('Using Firebase credentials from environment variables');
          firebaseConfig = {
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              // Replace escaped newlines in the private key
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
          };
          
          // Initialize Firebase app with env vars
          if (!admin.apps.length) {
            admin.initializeApp(firebaseConfig);
          } else {
            admin.app().delete().then(() => {
              admin.initializeApp(firebaseConfig);
            });
          }
          
          console.log('Firebase Admin SDK initialized with environment variables');
          return; // Exit initialization flow since we've initialized with env vars
        } else {
          throw new Error('No valid Firebase credentials found');
        }
      }
    }
    
    // Initialize with the service account we found
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
    
    // Initialize Firebase app
    if (!admin.apps.length) {
      admin.initializeApp(firebaseConfig);
    } else {
      admin.app().delete().then(() => {
        admin.initializeApp(firebaseConfig);
      });
    }
    
    console.log('Firebase Admin SDK initialized properly');
  } catch (error) {
    console.error('ERROR INITIALIZING FIREBASE:', error);
    // Continue execution without Firebase if needed
  }
  
  db = admin.firestore();
  console.log('Firestore database connected - USING REAL DATABASE');
} catch (error) {
  console.error('ERROR INITIALIZING FIREBASE:', error);
  process.exit(1); // Force exit if Firebase fails - we don't want mock data
}

// Initialize the app
const app = express();
const port = 3001; // Force port 3001

// Setup CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002', 
  'http://localhost:3001', 
  'https://rippleexchange.org',
  'https://www.rippleexchange.org',
  'http://rippleexchange.org',
  'https://rippleexchange.web.app',
  'https://rippleexchange.org/send-verification-code',
  '*' // Allow all origins temporarily while testing
];

console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS: ${origin}`);
      // Return true for now to debug
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Enable pre-flight for all routes
app.options('*', cors(corsOptions));

// Additional headers to help with CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Increase json size limit to handle large requests
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Add middleware to handle large headers
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Create a single API router - use this for all /api routes
const apiRouter = express.Router();

// Basic API endpoints
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', serverKey });
});

// Email API endpoints
apiRouter.options('/send-verification-code', cors(corsOptions));
apiRouter.post('/send-verification-code', cors(corsOptions), async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log('Received verification request:', { 
      email, 
      hasCode: !!code,
      contentType: req.headers['content-type']
    });
    
    if (!email) {
      console.log('Missing email in verification request');
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    console.log(`Server: Sending verification code to ${email}`);
    
    try {
      const result = await emailService.sendVerificationEmail(email, code || null);
      console.log('Email sending result:', result);
      
      if (result.success) {
        return res.json({ success: true, message: 'Verification code sent successfully' });
      } else {
        console.error('Email service error:', result.error);
        return res.status(500).json({ success: false, error: result.error || 'Failed to send verification code' });
      }
    } catch (emailError) {
      console.error('Email service exception:', emailError);
      return res.status(500).json({ 
        success: false, 
        error: `Email service error: ${emailError.message}` 
      });
    }
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    });
  }
});

apiRouter.post('/send-password-reset', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    console.log(`Server: Sending password reset to ${email}`);
    
    const result = await emailService.sendPasswordResetEmail(email, code || null);
    
    if (result.success) {
      return res.json({ success: true, message: 'Password reset email sent successfully' });
    } else {
      return res.status(500).json({ success: false, error: result.error || 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Error sending password reset:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// New endpoint for transfer notifications
apiRouter.post('/send-transfer-notification', async (req, res) => {
  try {
    const { email, transferData } = req.body;
    
    if (!email || !transferData) {
      return res.status(400).json({ success: false, error: 'Email and transfer data are required' });
    }
    
    console.log(`Server: Sending transfer notification to ${email}`);
    
    // Use the actual sendTransferNotification function
    const result = await emailService.sendTransferNotification(email, transferData);
    
    if (result.success) {
      return res.json({ success: true, message: 'Transfer notification sent successfully' });
    } else {
      console.error('Failed to send transfer notification:', result.error);
      return res.status(500).json({ success: false, error: result.error || 'Failed to send transfer notification' });
    }
  } catch (error) {
    console.error('Error sending transfer notification:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add a new endpoint for verifying OTP codes
apiRouter.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, uid } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and verification code are required' 
      });
    }

    if (!uid) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    console.log(`Server: Verifying OTP for user with email: ${email}`);
    
    try {
      // Get user data from Firestore
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      const userData = userDoc.data();
      
      // Check if OTP matches what's stored in the database
      if (userData.otp === otp) {
        // Update user document to mark as verified
        await userRef.update({ 
          emailVerified: true,
          otp: null // Clear OTP after successful verification
        });
        
        return res.json({ 
          success: true, 
          message: 'Email verified successfully' 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid verification code' 
        });
      }
    } catch (dbError) {
      console.error('Database error during OTP verification:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during verification' 
      });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Mount API router first - all API routes go through this
app.use('/api', apiRouter);

// Also add direct access to send-verification-code as a fallback
app.options('/send-verification-code', cors(corsOptions));
app.post('/send-verification-code', cors(corsOptions), async (req, res) => {
  console.log('Direct endpoint access for verification code, redirecting to API route');
  
  try {
    // Forward to the actual API endpoint
    const { email, code } = req.body;
    const result = await emailService.sendVerificationEmail(email, code || null);
    
    if (result.success) {
      return res.json({ success: true, message: 'Verification code sent successfully' });
    } else {
      console.error('Email service error in direct endpoint:', result.error);
      return res.status(500).json({ success: false, error: result.error || 'Failed to send verification code' });
    }
  } catch (error) {
    console.error('Error in direct verification endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    });
  }
});

// Add this line where you setup other routes
app.use('/api', proxyRoutes);

// Serve static files from build directory with proper MIME types
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, filePath) => {
    // Add CORS headers for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Set correct content types
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    } else if (filePath.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
    } else if (filePath.endsWith('.eot')) {
      res.setHeader('Content-Type', 'application/vnd.ms-fontobject');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Serve emails directory for viewing saved emails in production
app.use('/emails', express.static(path.join(__dirname, 'emails')));

// This must be the last route - handles React routing
app.get('*', (req, res) => {
  // Always serve the index.html for any route - React's router will handle the route
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
const serverKey = Math.random().toString(36).substring(2, 15);
app.listen(port, () => {
  console.log(`Server running on port ${port} (key: ${serverKey})`);
  console.log(`API available at: http://localhost:${port}/api`);
});

// Add HTTPS server for local development
if (process.env.NODE_ENV === 'development') {
  try {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    
    // Check if certificates exist, if not, create self-signed certificates
    const certDir = path.join(__dirname, 'certs');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');
    
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
      console.log('Created directory for SSL certificates:', certDir);
    }
    
    // If certificates don't exist, log instructions to create them
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log('\n=== SSL Certificates Not Found ===');
      console.log('To create self-signed certificates, run these commands:');
      console.log(`mkdir -p ${certDir}`);
      console.log(`openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout ${keyPath} -out ${certPath}`);
      console.log('\nThen restart the server to enable HTTPS.\n');
    } else {
      // Start HTTPS server with existing certificates
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      const httpsPort = 3443;
      https.createServer(httpsOptions, app).listen(httpsPort, () => {
        console.log(`HTTPS server running on port ${httpsPort}`);
        console.log(`Secure API available at: https://localhost:${httpsPort}/api`);
      });
    }
  } catch (error) {
    console.error('Failed to start HTTPS server:', error.message);
  }
}