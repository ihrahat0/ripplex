const admin = require('firebase-admin');
const serviceAccount = require('./src/firebase/new-private-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getDeposits() {
  try {
    console.log('Fetching cached deposits...');
    
    // Get deposits from 'transactions' collection
    const depositsQuery = db.collection('transactions')
      .where('type', '==', 'deposit')
      .orderBy('timestamp', 'desc')
      .limit(50);
    
    const depositsSnapshot = await depositsQuery.get();
    
    if (depositsSnapshot.empty) {
      console.log('No deposits found');
      return [];
    }
    
    console.log(`Found ${depositsSnapshot.size} deposits`);
    
    // Format and return the deposits
    const deposits = depositsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : null
      };
    });
    
    return deposits;
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return [];
  }
}

async function getWalletBalances() {
  try {
    console.log('Fetching wallet balances...');
    
    // Get all wallet addresses
    const walletSnapshot = await db.collection('walletAddresses').get();
    
    if (walletSnapshot.empty) {
      console.log('No wallets found');
      return [];
    }
    
    console.log(`Found ${walletSnapshot.size} wallets`);
    
    // Format and return the wallets with balances
    const wallets = walletSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    return wallets;
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    return [];
  }
}

async function getTotalBalances() {
  try {
    console.log('Fetching total balances...');
    
    const totalBalancesDoc = await db.collection('admin').doc('totalBalances').get();
    
    if (!totalBalancesDoc.exists) {
      console.log('No total balances document found');
      return null;
    }
    
    return totalBalancesDoc.data();
  } catch (error) {
    console.error('Error fetching total balances:', error);
    return null;
  }
}

async function main() {
  console.log('Starting deposit and balance check...');
  
  // Get deposits
  const deposits = await getDeposits();
  console.log('Recent deposits:');
  console.log(JSON.stringify(deposits, null, 2));
  
  // Get wallet balances
  const wallets = await getWalletBalances();
  console.log('\nWallet balances:');
  console.log(JSON.stringify(wallets, null, 2));
  
  // Get total balances
  const totalBalances = await getTotalBalances();
  console.log('\nTotal balances:');
  console.log(JSON.stringify(totalBalances, null, 2));
  
  // Cleanup
  admin.app().delete();
}

main().catch(console.error); 