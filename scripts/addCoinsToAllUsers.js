// Firebase App (the core Firebase SDK) is always required and must be listed first
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

// Firebase configuration from the project
const firebaseConfig = {
  apiKey: "AIzaSyDOryM3Wo2FOar4Z8b1-VwH6d13bJTgvLY",
  authDomain: "infinitysolution-ddf7d.firebaseapp.com",
  projectId: "infinitysolution-ddf7d",
  storageBucket: "infinitysolution-ddf7d.appspot.com",
  messagingSenderId: "556237630311",
  appId: "1:556237630311:web:c78594281662f5b6d19dc2",
  measurementId: "G-K1DJ7TH9SL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addCoinsToAllUsers() {
  console.log('Starting to add coins to all users...');
  
  try {
    // Get all coins from the coins collection
    console.log('Fetching all coins from the database...');
    const coinsSnapshot = await getDocs(collection(db, 'coins'));
    const allCoins = coinsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${allCoins.length} coins in the database.`);
    
    // Get all users
    console.log('Fetching all users from the database...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs;
    console.log(`Found ${users.length} users in the database.`);
    
    // Process users in batches of 500 for better performance
    const batchSize = 500;
    let processedUsers = 0;
    let updatedUsers = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = writeBatch(db);
      const userBatch = users.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} (${userBatch.length} users)...`);
      
      for (const userDoc of userBatch) {
        const userData = userDoc.data();
        
        // Check if the user has a balances field
        if (!userData.balances) {
          userData.balances = {};
        }
        
        // Check which coins are missing
        const missingCoins = allCoins.filter(coin => 
          !userData.balances[coin.symbol] && coin.symbol && coin.symbol.length > 0
        );
        
        if (missingCoins.length > 0) {
          console.log(`User ${userDoc.id} is missing ${missingCoins.length} coins.`);
          
          // Add missing coins with 0 balance
          const updatedBalances = { ...userData.balances };
          missingCoins.forEach(coin => {
            updatedBalances[coin.symbol] = 0;
          });
          
          // Add to batch
          batch.update(doc(db, 'users', userDoc.id), {
            balances: updatedBalances
          });
          updatedUsers++;
        }
        
        processedUsers++;
        if (processedUsers % 100 === 0) {
          console.log(`Processed ${processedUsers} of ${users.length} users (${Math.round((processedUsers / users.length) * 100)}%)`);
        }
      }
      
      // Commit the batch
      await batch.commit();
      console.log(`Batch ${Math.floor(i/batchSize) + 1} committed successfully.`);
    }
    
    console.log(`\nProcess completed successfully!`);
    console.log(`Total users processed: ${processedUsers}`);
    console.log(`Users with updated balances: ${updatedUsers}`);
    
  } catch (error) {
    console.error('Error adding coins to users:', error);
  }
}

// Run the function
addCoinsToAllUsers(); 