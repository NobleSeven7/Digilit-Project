// Design rule checks (see DESIGN.md, rules marked "(checked)").
// Run with: npm run check:design
// Fails (exit code 1) if any component breaks a rule the team has set.
// Plain Node, no extra libraries.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

// Every .jsx/.js/.css file under src/.
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return files(full)
    return /\.(jsx?|css)$/.test(entry.name) ? [full] : []
  })
}

// Each check: which files it reads, what it looks for, and what to do instead.
const CHECKS = [
  {
    id: 'C1',
    rule: 'No small ALL-CAPS labels (DESIGN.md > Typography)',
    applies: (file) => /\.(jsx|css)$/.test(file),
    pattern: /\buppercase\b|text-transform:\s*uppercase/,
    fix: 'Use sentence case.',
  },
  {
    id: 'C2',
    rule: 'No marketing phrases (DESIGN.md > Copy)',
    applies: (file) => /\.jsx?$/.test(file),
    pattern: /\b(seamless(ly)?|revolutioni[sz]e\w*|supercharge\w*|effortless(ly)?|unlock(s|ing)?)\b/i,
    fix: 'Say plainly what it does.',
  },
  {
    id: 'C3a',
    rule: 'Motion uses --ease-out / --ease-in-out, never ease-in or transition: all (DESIGN.md > Motion)',
    applies: (file) => /\.(jsx|css)$/.test(file),
    pattern: /transition-all|transition:\s*all\b|\bease-in\b(?!-out)/,
    fix: 'Name the properties and use var(--ease-out).',
  },
  {
    id: 'C3b',
    rule: 'No decorative gradients or glow shadows in components (DESIGN.md > Surfaces)',
    applies: (file) => /\.jsx$/.test(file),
    pattern: /bg-gradient|gradient-to-|linear-gradient|radial-gradient|shadow-\[0_0_/,
    fix: 'Use flat token colours; elevation uses --shadow-rest / --shadow-lift.',
  },
  {
    id: 'C3c',
    rule: 'No emoji as icons (DESIGN.md > Surfaces)',
    applies: (file) => /\.jsx$/.test(file),
    pattern: /\p{Extended_Pictographic}/u,
    fix: 'Use an icon from src/components/Icons.jsx.',
  },
  {
    id: 'C4',
    rule: 'No raw hex colours in components; use tokens (DESIGN.md > Color)',
    applies: (file) => /\.jsx$/.test(file),
    pattern: /(?<![&\w])#(?:[0-9a-fA-F]{3}){1,2}\b(?![\w/-])/,
    fix: 'Use a token class (bg-brand, text-hold-ink ...) or var(--color-...).',
  },
]

let problems = 0
for (const file of files(SRC)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    for (const check of CHECKS) {
      if (!check.applies(file) || !check.pattern.test(line)) continue
      problems++
      console.log(`${check.id} ${path.relative(ROOT, file)}:${index + 1}  ${check.rule}`)
      console.log(`    ${line.trim().slice(0, 140)}`)
      console.log(`    Fix: ${check.fix}`)
    }
  })
}

if (problems) {
  console.log(`\n${problems} design rule problem(s). See DESIGN.md.`)
  process.exit(1)
}
console.log('Design rules: no problems found.')
