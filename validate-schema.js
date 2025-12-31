const fs = require('fs');

const data = JSON.parse(fs.readFileSync('commands.json', 'utf8'));
let issues = [];

// Expected page schema order
const expectedPageKeys = ['name', 'title', 'description', 'emoji', 'embeds'];

data.forEach((cmd, cmdIdx) => {
  // Check command level
  if (!cmd.name) {
    issues.push(`Command at index ${cmdIdx} is missing 'name' field`);
  }
  if (!cmd.hasOwnProperty('description')) {
    issues.push(`Command '${cmd.name}' is missing 'description' field`);
  }
  if (!cmd.hasOwnProperty('ephemeral')) {
    issues.push(`Command '${cmd.name}' is missing 'ephemeral' field`);
  }
  if (!cmd.embed) {
    issues.push(`Command '${cmd.name}' is missing 'embed' field`);
  }
  // Pages are optional - some commands only have a single embed

  // Check pages
  if (cmd.pages) {
    cmd.pages.forEach((page, pageIdx) => {
      const pageName = page.name || `page ${pageIdx}`;

      // Check required fields
      if (!page.title) {
        issues.push(`Command '${cmd.name}' -> Page '${pageName}' is missing 'title' field`);
      }
      if (!page.hasOwnProperty('description')) {
        issues.push(`Command '${cmd.name}' -> Page '${pageName}' is missing 'description' field`);
      }
      if (!page.hasOwnProperty('emoji')) {
        issues.push(`Command '${cmd.name}' -> Page '${pageName}' is missing 'emoji' field`);
      }
      if (!page.embeds) {
        issues.push(`Command '${cmd.name}' -> Page '${pageName}' is missing 'embeds' field`);
      }

      // Check field order
      const keys = Object.keys(page);
      const relevantKeys = keys.filter(k => expectedPageKeys.includes(k));
      const expectedOrder = expectedPageKeys.filter(k => relevantKeys.includes(k));

      let currentIndex = -1;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (expectedPageKeys.includes(key)) {
          const expectedIndex = expectedOrder.indexOf(key);
          if (expectedIndex < currentIndex) {
            issues.push(`Command '${cmd.name}' -> Page '${pageName}' has '${key}' out of order (expected: ${expectedOrder.join(', ')})`);
            break;
          }
          currentIndex = expectedIndex;
        }
      }
    });
  }
});

if (issues.length > 0) {
  console.log(`Found ${issues.length} issue(s):\n`);
  issues.forEach(i => console.log('  - ' + i));
  process.exit(1);
} else {
  console.log('✓ All pages have required fields in correct order!');
}
