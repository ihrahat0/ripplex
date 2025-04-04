#!/bin/bash

# This script will help convert app. endpoints to apiRouter. endpoints in server.js

if [ ! -f server.js ]; then
    echo "Error: server.js not found in current directory!"
    exit 1
fi

# Create a backup
cp server.js server.js.bak
echo "Created backup: server.js.bak"

# Match app.get|post|put|delete('/api/... and replace with apiRouter.get|post|put|delete('/...
# This removes the /api prefix from the route paths

sed -i.tmp 's/app\.\(get\|post\|put\|delete\)("\/api\/\([^"]*\)"/apiRouter.\1("\/\2"/g' server.js
sed -i.tmp "s/app\.\(get\|post\|put\|delete\)('\/api\/\([^']*\)'/apiRouter.\1('\/\2'/g" server.js

# Also match app.get|post|put|delete('/admin/... and replace with apiRouter.get|post|put|delete('/admin/...
sed -i.tmp 's/app\.\(get\|post\|put\|delete\)("\/admin\/\([^"]*\)"/apiRouter.\1("\/admin\/\2"/g' server.js
sed -i.tmp "s/app\.\(get\|post\|put\|delete\)('\/admin\/\([^']*\)'/apiRouter.\1('\/admin\/\2'/g" server.js

# Remove the temporary file
rm server.js.tmp

echo "Conversion complete. Please review server.js changes."
echo "If something went wrong, restore from server.js.bak" 