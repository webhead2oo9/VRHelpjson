const fs = require('fs');
const path = require('path');

let issues = [];

const commandDir = 'commands';
const files = fs.readdirSync(commandDir)
  .filter(file => file.endsWith('.json'))
  .sort();

if (files.length === 0) {
  issues.push('commands/ contains no .json files');
}

// Expected page schema order
const expectedPageKeys = ['name', 'title', 'description', 'emoji', 'embed', 'embeds'];

files.forEach((file, cmdIdx) => {
  const filePath = path.join(commandDir, file);
  let cmd;
  try {
    cmd = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    issues.push(`${filePath} is not valid JSON: ${err.message}`);
    return;
  }

  // Check command level
  if (!cmd.name) {
    issues.push(`Command file ${filePath} is missing 'name' field`);
  } else {
    const expectedName = path.basename(file, '.json');
    if (cmd.name !== expectedName) {
      issues.push(`Command file ${filePath} has name '${cmd.name}' but expected '${expectedName}'`);
    }
  }
  if (!cmd.hasOwnProperty('description')) {
    issues.push(`Command '${cmd.name}' is missing 'description' field`);
  }
  if (!cmd.embed && !cmd.embeds && !cmd.pages) {
    issues.push(`Command '${cmd.name}' is missing 'embed', 'embeds', or 'pages' field`);
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
      if (!page.embed && !page.embeds) {
        issues.push(`Command '${cmd.name}' -> Page '${pageName}' is missing 'embed' or 'embeds' field`);
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
  console.log('✓ All command files have required fields in correct order!');
}
