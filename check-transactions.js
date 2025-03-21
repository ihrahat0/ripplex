const admin = require('firebase-admin');
const serviceAccount = require('./src/firebase/new-private-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getTransactions() {
  try {
    console.log('Fetching transactions...');
    
    // Get transactions from 'transactions' collection
    const transactionsQuery = db.collection('transactions')
      .orderBy('timestamp', 'desc')
      .limit(50);
    
    const transactionsSnapshot = await transactionsQuery.get();
    
    if (transactionsSnapshot.empty) {
      console.log('No transactions found');
      return [];
    }
    
    console.log(`Found ${transactionsSnapshot.size} transactions`);
    
    // Format and return the transactions
    const transactions = transactionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : null
      };
    });
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

async function main() {
  console.log('Starting transaction check...');
  
  // Get transactions
  const transactions = await getTransactions();
  console.log('Transactions:');
  console.log(JSON.stringify(transactions, null, 2));
  
  // Cleanup
  admin.app().delete();
}

main().catch(console.error); 