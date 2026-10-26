const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-publish verification...');

// 1. Ensure no .env files are staged
if (fs.existsSync('.env') && !fs.readFileSync('.gitignore', 'utf8').includes('.env')) {
  console.error('❌ ERROR: .env file found and not in .gitignore!');
  process.exit(1);
}

// 2. Secret keyword scan in project files
const forbiddenKeywords = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'ghp_', 'sk_live_'];
const filesToCheck = [
  'index.html',
  'menu.html',
  'book-a-table.html',
  'about.html',
  'contact.html',
  'admin.html',
  'login.html',
  'supabase-client.js',
  'admin-auth.js',
  'admin-api.js'
];

let issues = 0;
filesToCheck.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    forbiddenKeywords.forEach(kw => {
      if (content.includes(kw)) {
        console.error(`❌ Security warning: Potential secret keyword "${kw}" found in ${f}`);
        issues++;
      }
    });
  }
});

if (issues > 0) {
  console.error(`❌ Pre-publish check failed with ${issues} issue(s).`);
  process.exit(1);
}

console.log('✅ All pre-publish checks passed! Safe to commit and push.');
