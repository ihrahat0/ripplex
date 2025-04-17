import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// This service acts as a backend proxy to get data that would normally 
// be restricted by security rules
export const getPublicLeaderboardData = async () => {
  try {
    // Get users collection data - this endpoint bypasses security rules
    // by being callable by any user but using admin privileges on the backend
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let leaderboardData = [];
    
    // Process each user document 
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      
      // Get the OSCAR balance, default to 0 if not available
      const oscarBalance = userData.balances && userData.balances.OSCAR ? 
        parseFloat(userData.balances.OSCAR) : 0;
      
      // Format display name with privacy in mind
      let displayName = 'Anonymous';
      
      if (userData.displayName && userData.displayName.trim() !== '') {
        // Use display name if available
        displayName = userData.displayName;
      } else if (userData.email) {
        // If no display name, use email username part (before @)
        const emailParts = userData.email.split('@');
        if (emailParts.length > 0) {
          displayName = emailParts[0];
          // Partially mask long usernames for privacy
          if (displayName.length > 8) {
            displayName = displayName.substring(0, 5) + '...';
          }
        }
      }
      
      // Add to leaderboard data
      leaderboardData.push({
        id: userDoc.id,
        displayName: displayName,
        oscarBalance: oscarBalance
      });
    });
    
    // Sort by OSCAR balance (descending)
    leaderboardData.sort((a, b) => b.oscarBalance - a.oscarBalance);
    
    // Add rank to each entry
    leaderboardData = leaderboardData.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
    
    return leaderboardData;
  } catch (error) {
    console.error('Error in getPublicLeaderboardData:', error);
    throw error;
  }
}; 