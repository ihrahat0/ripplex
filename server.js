require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const emailService = require('./server/utils/emailService');
const { ethers } = require('ethers');
const { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } = require('@solana/web3.js');
const axios = require('axios');
const { Web3 } = require('web3');
const solanaWeb3 = require('@solana/web3.js');

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
const port = process.env.PORT || 3001;

// Setup CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002', 
  'http://localhost:3001', 
  'https://rippleexchange.org',
  'https://www.rippleexchange.org',
  'http://rippleexchange.org'
];

console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

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

// Mount API router first - all API routes go through this
app.use('/api', apiRouter);

// Serve static files from build directory with proper MIME types
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve emails directory for viewing saved emails in production
app.use('/emails', express.static(path.join(__dirname, 'emails')));

// This must be the last route - handles React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});