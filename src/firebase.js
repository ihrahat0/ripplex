// Import everything from the config file
import app, { auth, db, googleProvider, storage } from './firebase/config';

// Re-export everything
export { auth, db, googleProvider, storage };
export default app; 