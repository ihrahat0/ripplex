import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to get leaderboard data either through Cloud Function (for normal users)
// or directly from Firestore (for admins)
export const getLeaderboardData = async (isAdmin = false) => {
  try {
    if (isAdmin) {
      // Admin access - fetch directly
      return await getLeaderboardFromFirestore();
    } else {
      // Regular user - fetch via Cloud Function
      return await getLeaderboardFromFunction();
    }
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    // If all else fails, try direct access as fallback
    return await getLeaderboardFromFirestore();
  }
};

// Direct Firestore access - works for admins
const getLeaderboardFromFirestore = async () => {
  try {
    // Get users collection
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
        email: userData.email || 'Anonymous',
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
    console.error('Error in getLeaderboardFromFirestore:', error);
    return [];
  }
};

// Cloud Function access - works for everyone
const getLeaderboardFromFunction = async () => {
  try {
    const functions = getFunctions();
    const getPublicLeaderboard = httpsCallable(functions, 'getPublicLeaderboard');
    
    const result = await getPublicLeaderboard();
    
    if (result.data && result.data.success) {
      return result.data.data;
    } else {
      console.error('Function returned error:', result.data?.error);
      return [];
    }
  } catch (error) {
    console.error('Error calling getPublicLeaderboard:', error);
    return [];
  }
}; 