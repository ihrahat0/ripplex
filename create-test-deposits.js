// Script to create test deposits directly in the database
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load the service account key from the default location
  serviceAccount = require('./serviceAccountKey.json');
  
  // Check if it contains placeholder values
  if (serviceAccount.private_key.includes('YOUR_PRIVATE_KEY')) {
    throw new Error('Private key contains placeholder value');
  }
} catch (error) {
  console.log('serviceAccountKey.json contains placeholder values, trying alternative file');
  
  // Try to load from the alternative location
  try {
    serviceAccount = require('./src/firebase/new-private-key.json');
    console.log('Using Firebase service account key from src/firebase/new-private-key.json');
  } catch (altError) {
    console.error('Failed to load Firebase service account key:', altError);
    process.exit(1);
  }
}

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('Firestore database connected');

// Function to generate a random transaction hash
function generateTxHash(chain) {
  const randomHex = () => Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  
  switch (chain) {
    case 'ethereum':
      return `0x${randomHex()}${randomHex()}${randomHex()}${randomHex()}`;
    case 'bsc':
      return `0x${randomHex()}${randomHex()}${randomHex()}${randomHex()}`;
    case 'polygon':
      return `0x${randomHex()}${randomHex()}${randomHex()}${randomHex()}`;
    case 'solana':
      return `${randomHex()}${randomHex()}${randomHex()}${randomHex()}`;
    default:
      return `0x${randomHex()}${randomHex()}${randomHex()}${randomHex()}`;
  }
}

// Create test deposits
async function createTestDeposits() {
  try {
    console.log('Creating test deposits...');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').limit(5).get();
    
    if (usersSnapshot.empty) {
      console.log('No users found, creating test deposits with mock user IDs');
      
      // Create deposits with mock user IDs
      const mockUserIds = ['user1', 'user2', 'user3'];
      await createDepositsForUsers(mockUserIds);
    } else {
      // Extract user IDs
      const userIds = [];
      usersSnapshot.forEach(doc => {
        userIds.push(doc.id);
      });
      
      console.log(`Found ${userIds.length} users`);
      await createDepositsForUsers(userIds);
    }
    
    console.log('Test deposits created successfully');
  } catch (error) {
    console.error('Error creating test deposits:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Create deposits for the given user IDs
async function createDepositsForUsers(userIds) {
  // Create 10 deposits
  const deposits = [];
  const batch = db.batch();
  
  for (let i = 0; i < 10; i++) {
    // Pick a random user
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    // Pick a random chain
    const chains = ['ethereum', 'bsc', 'polygon', 'solana'];
    const chain = chains[Math.floor(Math.random() * chains.length)];
    
    // Pick a random token based on chain
    let token;
    switch (chain) {
      case 'ethereum':
        token = 'ETH';
        break;
      case 'bsc':
        token = 'BNB';
        break;
      case 'polygon':
        token = 'MATIC';
        break;
      case 'solana':
        token = 'SOL';
        break;
      default:
        token = 'ETH';
    }
    
    // Generate a random amount between 0.01 and 1.0
    const amount = (Math.random() * 0.99 + 0.01).toFixed(6);
    
    // Generate a random transaction hash
    const txHash = generateTxHash(chain);
    
    // Create a deposit timestamp between 1 and 30 days ago
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    
    // Create the deposit object
    const deposit = {
      userId,
      chain,
      token,
      amount,
      txHash,
      timestamp: admin.firestore.Timestamp.fromDate(timestamp),
      status: Math.random() > 0.2 ? 'completed' : 'pending', // 80% completed, 20% pending
      fromAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      toAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 10000000,
      confirmations: Math.floor(Math.random() * 100) + 1,
      createdAt: admin.firestore.Timestamp.fromDate(timestamp),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    };
    
    // Add to deposits array
    deposits.push(deposit);
    
    // Add to Firestore batch
    const depositRef = db.collection('deposits').doc();
    batch.set(depositRef, deposit);
    
    console.log(`Created deposit: ${deposit.amount} ${deposit.token} on ${deposit.chain} for user ${deposit.userId}`);
  }
  
  // Commit the batch
  await batch.commit();
  console.log(`Committed ${deposits.length} deposits to Firestore`);
}

// Run the function
createTestDeposits(); 