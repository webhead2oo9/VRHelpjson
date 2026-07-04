// Validate the repo invariants ajv can't express (the CI workflow runs
// ajv-cli against commands.schema.json separately): filename === name, page
// names unique within each command, and each render unit's total rendered
// text within the Components-V2 message budget. Exits 1 with a per-file
// issue list.
const fs = require("fs");
const path = require("path");

const NAME_PATTERN = /^[a-z0-9_-]{1,32}$/;
const COMMANDS_DIR = "commands";

// Components V2 caps a message at 4000 characters across all text
// components; 3800 leaves headroom for the page dropdown & bot chrome.
// Must match the bot's renderer: heading -> "## text" or "## [text](url)",
// field -> "**name**\nvalue", small -> "-# text".
const UNIT_TEXT_BUDGET = 3800;

function renderedBlockChars(block) {
  switch (block.type) {
    case "heading":
      return 3 + block.text.length + (block.url ? block.url.length + 4 : 0);
    case "text":
      return block.text.length;
    case "field":
      return block.name.length + 5 + block.value.length;
    case "small":
      return 3 + block.text.length;
    default:
      return 0; // divider, images
  }
}

function checkUnitBudget(filePath, label, blocks, issues) {
  const total = blocks.reduce((sum, block) => sum + renderedBlockChars(block), 0);
  if (total > UNIT_TEXT_BUDGET) {
    issues.push(
      `${filePath}: ${label} renders ${total} text characters (max ${UNIT_TEXT_BUDGET} per view) — split content across pages`,
    );
  }
}

const issues = [];
const files = fs
  .readdirSync(COMMANDS_DIR)
  .filter(f => f.endsWith(".json"))
  .sort();

if (files.length === 0) {
  issues.push(`${COMMANDS_DIR}/ contains no .json files`);
}

for (const file of files) {
  const filePath = path.join(COMMANDS_DIR, file);
  let command;
  try {
    command = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    issues.push(`${filePath}: invalid JSON (${err.message})`);
    continue;
  }

  const expectedName = path.basename(file, ".json");
  if (command.name !== expectedName) {
    issues.push(`${filePath}: name '${command.name}' does not match filename '${expectedName}'`);
  }
  if (!NAME_PATTERN.test(expectedName)) {
    issues.push(`${filePath}: filename is not a valid command name`);
  }
  if (command.format !== 2) {
    issues.push(`${filePath}: requires "format": 2 (embed commands are no longer supported)`);
    continue;
  }

  if (Array.isArray(command.pages)) {
    const seen = new Set();
    for (const page of command.pages) {
      if (typeof page.name !== "string") continue;
      if (seen.has(page.name)) {
        issues.push(`${filePath}: duplicate page name '${page.name}'`);
      }
      seen.add(page.name);
    }
  }

  if (Array.isArray(command.blocks)) {
    checkUnitBudget(filePath, "top-level blocks", command.blocks, issues);
  }
  for (const page of command.pages ?? []) {
    if (Array.isArray(page.blocks)) {
      checkUnitBudget(filePath, `page '${page.name}'`, page.blocks, issues);
    }
  }
}

if (issues.length > 0) {
  console.error(`Found ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log(`OK: ${files.length} command files valid.`);
