#!/usr/bin/env node

/**
 * This script fixes the routing issues in the server.js file
 * It handles the problem of duplicate /api prefixes and ensures proper routing
 */

const fs = require('fs');
const path = require('path');

// Check if server.js exists
const serverPath = path.join(process.cwd(), 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('Error: server.js not found in current directory!');
  process.exit(1);
}

// Create a backup
const backupPath = path.join(process.cwd(), 'server.js.bak');
fs.copyFileSync(serverPath, backupPath);
console.log('Created backup: server.js.bak');

// Read the server.js file
let content = fs.readFileSync(serverPath, 'utf8');

// First replace the middleware section with a fixed version
const middlewareSection = `
// Middleware
app.use(cors(corsOptions));

// Increase json size limit to handle large requests
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Add middleware to handle large headers
app.use((req, res, next) => {
  // Increase header limits
  req.connection.setMaxListeners(0);
  req.connection.setTimeout(600000); // 10 minutes
  next();
});

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve emails directory for viewing saved emails in production
app.use('/emails', express.static(path.join(__dirname, 'emails')));

// Setup API routing properly - no mount path prefix to avoid double /api/api issue
const apiRouter = express.Router();
app.use(apiRouter);

// Fallback for client-side routing - MUST come AFTER API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
`;

// Replace the existing middleware section
const middlewareRegex = /\/\/ Middleware.*?\/\/ Serve emails directory for viewing saved emails in production.*?app\.use\('\/emails'.*?\);/s;
content = content.replace(middlewareRegex, middlewareSection);

// Update API endpoints to use apiRouter but keep the full path including /api prefix
// Find all app.get|post|put|delete('/api/...) patterns
const endpointRegex = /app\.(get|post|put|delete)\(['"]\/api\/([^'"]*)['"]/g;
content = content.replace(endpointRegex, 'apiRouter.$1(\'/api/$2\'');

// Same for endpoints without the /api prefix
const adminEndpointRegex = /app\.(get|post|put|delete)\(['"]\/admin\/([^'"]*)['"]/g;
content = content.replace(adminEndpointRegex, 'apiRouter.$1(\'/admin/$2\'');

// Write the changes back to server.js
fs.writeFileSync(serverPath, content);

console.log('Fixed API routing issues in server.js');
console.log('Please restart your server to apply changes');
console.log('If something went wrong, restore from server.js.bak'); 