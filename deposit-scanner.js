const fs = require('fs');
const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
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

// Function to fetch transactions from blockchain
async function fetchTransactions(address) {
  try {
    console.log(`Fetching BSC transactions for address: ${address}...`);
    
    // Get API key from environment or use a default for development
    const apiKey = process.env.BLOCKCHAIN_API_KEY || 'your-api-key';
    
    const response = await axios.post('http://localhost:3001/api/blockchain-proxy', {
      action: 'fetch-transactions',
      chain: 'bsc',
      address: address,
      apiKey: apiKey // Add API key to request
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`API Response received for ${address}. Response structure:`, 
      Object.keys(response.data).length > 0 ? 
      `Found ${Object.keys(response.data).length} top-level keys` : 
      'Empty response');
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching transactions for ${address}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Function to fetch all users from Firebase
async function fetchAllUsers() {
  // First try to load users from Firebase
  try {
    const db = initializeFirebase();
    
    // Try to load from cache first to reduce Firebase reads
    const cachedUsers = loadUsersFromCache();
    if (cachedUsers && cachedUsers.length > 0) {
      console.log(`Using ${cachedUsers.length} users from cache to avoid Firebase quota limits`);
      return cachedUsers;
    }
    
    // Query users collection from Firestore with a limit to avoid quota issues
    console.log('Fetching users from Firebase (limited to 100 to prevent quota exhaustion)...');
    const usersSnapshot = await db.collection('users').limit(100).get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in the database');
      return [];
    }
    
    // Map Firestore documents to our required format
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      
      // Check if user has wallet address
      if (userData.walletAddress) {
        users.push({
          address: userData.walletAddress,
          email: userData.email || doc.id,
          userId: doc.id
        });
      }
    });
    
    console.log(`Found ${users.length} users with wallet addresses in Firebase`);
    
    // Save users to local cache for future use
    saveUsersToCache(users);
    
    return users;
  } catch (error) {
    console.error('Error fetching users from Firebase:', error.message);
    
    // Try to load from cache instead of using sample users
    const cachedUsers = loadUsersFromCache();
    if (cachedUsers && cachedUsers.length > 0) {
      console.log(`Falling back to ${cachedUsers.length} cached users due to Firebase error`);
      return cachedUsers;
    }
    
    console.log('No cached users available and Firebase quota exceeded. Using emergency fallback.');
    // Emergency fallback - use a few sample addresses if we have no cache and Firebase is failing
    return [
      {
        address: '0x5754284f345afc66a98fbb0a0afe71e0f007b949',
        email: 'emergency-fallback@example.com',
        userId: 'emergency-fallback'
      }
    ];
  }
}

// Function to save users to local cache
function saveUsersToCache(users) {
  try {
    fs.writeFileSync('user-wallet-cache.json', JSON.stringify(users, null, 2));
    console.log('User wallet data saved to local cache');
  } catch (error) {
    console.error('Error saving users to cache:', error.message);
  }
}

// Function to load users from cache
function loadUsersFromCache() {
  try {
    if (fs.existsSync('user-wallet-cache.json')) {
      const cachedUsers = JSON.parse(fs.readFileSync('user-wallet-cache.json', 'utf8'));
      console.log(`Loaded ${cachedUsers.length} users from local cache`);
      return cachedUsers;
    } else {
      console.log('No local cache file found. Cannot proceed without user data.');
      return [];
    }
  } catch (error) {
    console.error('Error loading users from cache:', error.message);
    return [];
  }
}

// Function to extract transactions from API response
function extractTransactions(response) {
  if (!response) return [];
  
  let transactions = [];
  
  if (Array.isArray(response)) {
    transactions = response;
  } else if (response.result && Array.isArray(response.result)) {
    transactions = response.result;
  } else if (response.status && response.message && response.result) {
    transactions = response.result;
  } else {
    for (const key in response) {
      if (Array.isArray(response[key])) {
        transactions = response[key];
        break;
      }
    }
  }
  
  return transactions;
}

// Process deposits for a specific user
async function processUserDeposits(user) {
  try {
    // Show email prominently in logs
    console.log(`========================================`);
    console.log(`SCANNING USER: ${user.email}`);
    console.log(`WALLET ADDRESS: ${user.address}`);
    console.log(`USER ID: ${user.userId}`);
    console.log(`========================================`);
    
    // Fetch transactions
    console.log(`Fetching BSC transactions for ${user.email} (${user.address})...`);
    const response = await fetchTransactions(user.address);
    const transactions = extractTransactions(response);
    
    if (transactions.length === 0) {
      console.log(`No transactions found for ${user.email}`);
      return [];
    }
    
    console.log(`Found ${transactions.length} transactions for ${user.email}`);
    
    const deposits = [];
    // In BNB Chain, we're interested in transactions where the user is the receiver
    transactions.forEach(tx => {
      // Check if the transaction is a deposit (received BNB)
      if (tx.to && tx.to.toLowerCase() === user.address.toLowerCase()) {
        // Convert value from wei to BNB (1 BNB = 10^18 wei)
        const amount = parseFloat(tx.value) / 1e18;
        
        deposits.push({
          userId: user.userId,
          email: user.email,
          amount: amount,
          txHash: tx.hash,
          fromAddress: tx.from,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          currency: 'BNB'
        });
      }
    });
    
    console.log(`Found ${deposits.length} deposits for ${user.email}`);
    return deposits;
  } catch (error) {
    console.error(`Error processing deposits for ${user.email}:`, error.message);
    return [];
  }
}

// Main function to scan deposits for all users
async function scanAllUserDeposits() {
  console.log('\n===============================================');
  console.log('SCANNING BSC DEPOSITS FOR ALL USERS FROM FIREBASE');
  console.log('===============================================\n');
  
  // 1. Fetch all users with wallet addresses from Firebase
  const users = await fetchAllUsers();
  console.log(`Found ${users.length} users with wallet addresses to scan`);
  
  if (users.length === 0) {
    console.log('No users with wallet addresses found. Exiting...');
    return;
  }
  
  // 2. Process deposits for each user
  const allDeposits = [];
  for (const user of users) {
    const userDeposits = await processUserDeposits(user);
    allDeposits.push(...userDeposits);
  }
  
  // 3. Display and save results
  console.log('\n===== BSC DEPOSIT SCAN RESULTS =====');
  console.log(`Total deposits found: ${allDeposits.length}`);
  
  if (allDeposits.length > 0) {
    // Sort deposits by timestamp (newest first)
    allDeposits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log('\nEmail\t\t\tAmount\t\tTimestamp\t\tTx Hash');
    console.log('----------------------------------------------------------------------------------------');
    
    allDeposits.forEach(deposit => {
      console.log(`${deposit.email}\t${deposit.amount.toFixed(4)} BNB\t${new Date(deposit.timestamp).toLocaleString()}\t${deposit.txHash.substring(0, 10)}...`);
    });

    // Generate and display deposit statistics
    const stats = generateDepositStats(allDeposits);
    displayDepositStats(stats);

    // Write detailed results to file
    fs.writeFileSync('bsc-deposit-results.json', JSON.stringify(allDeposits, null, 2));
    console.log('\nDetailed results saved to bsc-deposit-results.json');
    
    // Try to update Firebase but handle quota errors gracefully
    try {
      await updateDepositDataInFirebase(allDeposits);
    } catch (error) {
      console.error(`Unable to update Firebase due to quota limitations: ${error.message}`);
      console.log('Deposit results are saved locally in bsc-deposit-results.json');
    }
  } else {
    console.log('\nNo deposits found for any users on BSC.');
    fs.writeFileSync('bsc-deposit-results.json', JSON.stringify([]));
  }
}

// Function to update deposit data in Firebase
async function updateDepositDataInFirebase(deposits) {
  try {
    console.log('\nUpdating deposit data in Firebase...');
    const db = initializeFirebase();
    
    // Split deposits into smaller batches to avoid quota issues
    // Process maximum 10 deposits at a time
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(deposits.length / BATCH_SIZE);
    
    console.log(`Processing ${deposits.length} deposits in ${totalBatches} batches (${BATCH_SIZE} per batch)`);
    
    let successCount = 0;
    
    // Process in batches
    for (let i = 0; i < totalBatches; i++) {
      try {
        const batch = db.batch();
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, deposits.length);
        const batchDeposits = deposits.slice(start, end);
        
        console.log(`Processing batch ${i+1}/${totalBatches} (deposits ${start+1}-${end})`);
        
        // Add each deposit to batch
        for (const deposit of batchDeposits) {
          // Create a reference to the deposit document using transaction hash
          const depositRef = db.collection('deposits').doc(deposit.txHash);
          batch.set(depositRef, {
            userId: deposit.userId,
            email: deposit.email,
            amount: deposit.amount,
            txHash: deposit.txHash,
            fromAddress: deposit.fromAddress,
            timestamp: admin.firestore.Timestamp.fromDate(new Date(deposit.timestamp)),
            currency: deposit.currency,
            chain: 'bsc',
            processed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Commit this batch
        await batch.commit();
        successCount += batchDeposits.length;
        console.log(`Successfully committed batch ${i+1}/${totalBatches}`);
        
        // Wait between batches to avoid rate limits
        if (i < totalBatches - 1) {
          console.log('Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (batchError) {
        console.error(`Error in batch ${i+1}/${totalBatches}: ${batchError.message}`);
        if (batchError.message.includes('RESOURCE_EXHAUSTED') || 
            batchError.message.includes('quota') || 
            batchError.message.includes('limit')) {
          console.log('Firebase quota exceeded. Stopping batch processing.');
          break;
        }
      }
    }
    
    console.log(`Successfully updated ${successCount}/${deposits.length} deposits in Firebase`);
    
    // If not all deposits were processed, save the remaining to a file
    if (successCount < deposits.length) {
      const remainingDeposits = deposits.slice(successCount);
      fs.writeFileSync('pending-firebase-deposits.json', JSON.stringify(remainingDeposits, null, 2));
      console.log(`${deposits.length - successCount} deposits could not be saved to Firebase due to quota limits.`);
      console.log('These deposits have been saved to pending-firebase-deposits.json for later processing.');
    }
  } catch (error) {
    console.error('Error updating deposit data in Firebase:', error.message);
    // Save all deposits to a file as a backup
    fs.writeFileSync('failed-firebase-deposits.json', JSON.stringify(deposits, null, 2));
    console.log('All deposits have been saved to failed-firebase-deposits.json for manual processing.');
    throw error; // Re-throw to be handled by the caller
  }
}

// Function to generate statistics about deposits
function generateDepositStats(deposits) {
  const stats = {
    totalBnb: 0,
    uniqueSenders: new Set(),
    uniqueReceivers: new Set(),
    highestDeposit: 0,
    highestDepositTx: null,
    lowestDeposit: Infinity,
    lowestDepositTx: null,
    averageDeposit: 0,
    depositsByDate: {},
    depositsByMonth: {},
    depositsByUser: {},
    totalTransactions: deposits.length
  };

  // Process each deposit
  deposits.forEach(deposit => {
    // Add to total BNB
    stats.totalBnb += deposit.amount;
    
    // Track unique senders and receivers
    stats.uniqueSenders.add(deposit.fromAddress);
    stats.uniqueReceivers.add(deposit.email);
    
    // Check for highest deposit
    if (deposit.amount > stats.highestDeposit) {
      stats.highestDeposit = deposit.amount;
      stats.highestDepositTx = deposit.txHash;
    }
    
    // Check for lowest deposit
    if (deposit.amount < stats.lowestDeposit && deposit.amount > 0) {
      stats.lowestDeposit = deposit.amount;
      stats.lowestDepositTx = deposit.txHash;
    }
    
    // Track deposits by date
    const date = new Date(deposit.timestamp).toLocaleDateString();
    stats.depositsByDate[date] = (stats.depositsByDate[date] || 0) + 1;
    
    // Track deposits by month
    const month = new Date(deposit.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!stats.depositsByMonth[month]) {
      stats.depositsByMonth[month] = {
        count: 0,
        amount: 0
      };
    }
    stats.depositsByMonth[month].count += 1;
    stats.depositsByMonth[month].amount += deposit.amount;
    
    // Track deposits by user
    if (!stats.depositsByUser[deposit.email]) {
      stats.depositsByUser[deposit.email] = {
        count: 0,
        amount: 0
      };
    }
    stats.depositsByUser[deposit.email].count += 1;
    stats.depositsByUser[deposit.email].amount += deposit.amount;
  });
  
  // Calculate average deposit
  stats.averageDeposit = stats.totalTransactions > 0 ? stats.totalBnb / stats.totalTransactions : 0;
  
  return stats;
}

// Function to display deposit statistics
function displayDepositStats(stats) {
  console.log('\n===== BSC DEPOSIT STATISTICS =====');
  console.log(`Total BNB Deposited: ${stats.totalBnb.toFixed(2)} BNB`);
  console.log(`Number of Deposits: ${stats.totalTransactions}`);
  console.log(`Unique Depositors: ${stats.uniqueSenders.size}`);
  console.log(`Unique Receivers: ${stats.uniqueReceivers.size}`);
  
  if (stats.totalTransactions > 0) {
    console.log(`Highest Deposit: ${stats.highestDeposit.toFixed(2)} BNB (${stats.highestDepositTx.substring(0, 10)}...)`);
    console.log(`Lowest Deposit: ${stats.lowestDeposit.toFixed(2)} BNB (${stats.lowestDepositTx.substring(0, 10)}...)`);
    console.log(`Average Deposit: ${stats.averageDeposit.toFixed(2)} BNB`);
  
    // Display deposits by user
    console.log('\n===== DEPOSITS BY USER =====');
    console.log('Email\t\t\tDeposits\tTotal BNB');
    console.log('---------------------------------------');
    
    Object.keys(stats.depositsByUser).forEach(email => {
      const { count, amount } = stats.depositsByUser[email];
      console.log(`${email}\t${count}\t\t${amount.toFixed(2)} BNB`);
    });
    
    // Display monthly deposit summary
    console.log('\n===== MONTHLY DEPOSIT SUMMARY =====');
    console.log('Month\t\tDeposits\tTotal BNB');
    console.log('---------------------------------------');
    
    // Sort months chronologically
    const sortedMonths = Object.keys(stats.depositsByMonth).sort((a, b) => {
      return new Date(a) - new Date(b);
    });
    
    sortedMonths.forEach(month => {
      const { count, amount } = stats.depositsByMonth[month];
      console.log(`${month}\t${count}\t\t${amount.toFixed(2)} BNB`);
    });
  }
  
  // Write stats to file for easier analysis
  fs.writeFileSync('bsc-deposit-stats.json', JSON.stringify(stats, null, 2));
  console.log('\nStatistics saved to bsc-deposit-stats.json');
}

// Run the scanner
scanAllUserDeposits(); 