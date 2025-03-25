const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase
function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      // Try to load service account key from multiple possible locations
      let serviceAccount;
      
      // List of possible paths for the service account key
      const possiblePaths = [
        './src/firebase/new-private-key.json',
        './new-private-key.json',
        './serviceAccountKey.json',
        './src/firebase/serviceAccountKey.json'
      ];
      
      // Try each path until we find a valid one
      for (const path of possiblePaths) {
        try {
          serviceAccount = require(path);
          console.log(`Firebase credentials loaded from ${path}`);
          break;
        } catch (e) {
          console.log(`Could not load Firebase credentials from ${path}`);
        }
      }
      
      if (!serviceAccount) {
        throw new Error('Could not find Firebase service account key file');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized');
    } catch (error) {
      console.error('Error initializing Firebase:', error.message);
      throw new Error('Failed to initialize Firebase');
    }
  }
  return admin.firestore();
}

// Function to run the deposit scanner
function runDepositScanner() {
  console.log(`Running deposit scanner at ${new Date().toISOString()}`);
  
  try {
    // Run the deposit scanner script
    const output = execSync('node deposit-scanner.js', { 
      env: {
        ...process.env,
        BLOCKCHAIN_API_KEY: process.env.BLOCKCHAIN_API_KEY || 'your-api-key'
      }
    });
    
    console.log('Deposit scanner output:', output.toString());
    
    // Check if deposits were found by reading the results file
    if (fs.existsSync('bsc-deposit-results.json')) {
      const deposits = JSON.parse(fs.readFileSync('bsc-deposit-results.json', 'utf8'));
      
      if (deposits.length > 0) {
        console.log(`Found ${deposits.length} deposits`);
        
        // Here you could also notify users, trigger other actions, etc.
        notifyDeposits(deposits);
      } else {
        console.log('No deposits found');
      }
    }
  } catch (error) {
    console.error('Error running deposit scanner:', error.message);
  }
}

// Function to notify about deposits
async function notifyDeposits(deposits) {
  try {
    const db = initializeFirebase();
    const batch = db.batch();
    
    // Group deposits by user
    const depositsByUser = {};
    
    deposits.forEach(deposit => {
      if (!depositsByUser[deposit.userId]) {
        depositsByUser[deposit.userId] = [];
      }
      depositsByUser[deposit.userId].push(deposit);
    });
    
    // Update user notifications
    for (const userId in depositsByUser) {
      const userDeposits = depositsByUser[userId];
      const totalAmount = userDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      
      // Create notification
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: userId,
        type: 'DEPOSIT',
        message: `You received ${totalAmount.toFixed(4)} BNB in ${userDeposits.length} transaction(s)`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        data: {
          deposits: userDeposits.map(d => ({
            amount: d.amount,
            txHash: d.txHash,
            timestamp: d.timestamp
          }))
        }
      });
      
      console.log(`Created notification for user ${userId} for ${userDeposits.length} deposits`);
    }
    
    await batch.commit();
    console.log('Successfully created notifications for deposits');
  } catch (error) {
    console.error('Error creating notifications:', error.message);
  }
}

// Schedule script to run every hour (you can adjust timing as needed)
console.log('Starting deposit scanner cron job');
cron.schedule('0 * * * *', () => {
  runDepositScanner();
});

// Also run immediately on startup
runDepositScanner();

console.log('Deposit scanner cron job is running...'); 