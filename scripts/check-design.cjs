// Design rule checks (see DESIGN.md, rules marked "(checked)").
// Run with: npm run check:design
// Fails (exit code 1) if any component breaks a rule the team has set.
// Plain Node, no extra libraries.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

// Every .jsx/.js/.css file under src/, except src/dev/: dev-only test tools
// (such as the break-ui data toggle) that never ship and are meant to look
// like plain browser chrome, not like the design.
const SKIP_DIRS = [path.join(SRC, 'dev')]
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return SKIP_DIRS.includes(full) ? [] : files(full)
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
    fix: 'Use flat token colours; only clickable cards use --shadow-rest.',
  },
  {
    id: 'C3c',
    rule: 'No emoji as icons (DESIGN.md > Surfaces)',
    applies: (file) => /\.jsx$/.test(file),
    pattern: /\p{Extended_Pictographic}/u,
    fix: 'Use an icon from src/components/Icons.jsx.',
  },
  {
    // Plain "ease" or "linear" are built-in curves, not the motion tokens.
    // The AI-check bar is linear on purpose: it measures time.
    id: 'C3d',
    rule: 'Motion curves are the --ease-out / --ease-in-out tokens, not plain ease or linear (DESIGN.md > Motion)',
    applies: (file) => /\.css$/.test(file),
    pattern: /^(?!.*ai-wait)\s*[^/*]*(?:animation|transition)(?:-timing-function)?\s*:[^;]*\b(?:ease|linear)\b(?![-(])/,
    fix: 'Use var(--ease-out) or var(--ease-in-out).',
  },
  {
    // Motion played from JavaScript (element.animate) follows the same rules.
    id: 'C3e',
    rule: 'Motion in JavaScript lasts 300ms or less and uses the motion tokens (DESIGN.md > Motion)',
    applies: (file) => /\.js$/.test(file),
    pattern: /\bduration:\s*(?:[3-9]\d[1-9]|[3-9][1-9]\d|[4-9]\d\d|\d{4,})\b|\beasing:\s*['"](?:ease|ease-in|ease-out|ease-in-out|linear)['"]/,
    fix: 'Keep it to 300ms or less and read the curve from --ease-out.',
  },
  {
    // Two corner sizes only (src/index.css): Tailwind's own sizes are switched
    // off, so one of them would show square corners without anyone noticing.
    id: 'C6',
    rule: 'Corners are rounded-control or rounded-surface (DESIGN.md > Surfaces)',
    applies: (file) => /\.(jsx|css)$/.test(file),
    pattern: /\brounded(?:-[trblse]{1,2})?-(?:xs|sm|md|lg|xl|2xl|3xl|4xl|\[[^\]]*\])(?![\w-])/,
    fix: 'Use rounded-control (buttons, fields, chips, badges) or rounded-surface (cards, bands); rounded-full only for dots, ticks and bars.',
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

// C5: UI motion lasts 300ms or less (DESIGN.md > Motion). Reads every
// animation and transition in src/index.css and takes each one's duration
// (the first time in it; later times are delays). The motions DESIGN.md
// names as exceptions are listed here, each with its reason.
const LONG_MOTION_ALLOWED = {
  '.ai-wait-bar': 'shows the AI check\'s 8-second wait',
  '.hero-enter': 'Home map intro, once per visit',
  '.route-draw': 'Home map intro, once per visit',
  '.stop-enter': 'Home map intro, once per visit',
  '.map-parcel': 'Home map intro, once per visit',
  '.photo-fade': 'Home photos fading in once loaded',
  '.stop-settle': 'the delivery celebration (paid)',
  '.tick-pop': 'the success tick',
}
{
  const file = path.join(SRC, 'index.css')
  // Blank out comments but keep line breaks, so line numbers stay right.
  let css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  // Duration tokens (--dur-quick: 150ms ...) are read as their values, so a
  // motion written with a token is measured like one written in ms.
  const durations = Object.fromEntries([...css.matchAll(/(--dur-[\w-]+)\s*:\s*(\d+(?:\.\d+)?m?s)/g)].map((m) => [m[1], m[2]]))
  css = css.replace(/var\((--dur-[\w-]+)\)/g, (whole, name) => (durations[name] ?? whole).padEnd(whole.length))
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(css))) {
    const selector = match[1].trim().split('\n').pop().trim()
    if (Object.keys(LONG_MOTION_ALLOWED).some((name) => selector.startsWith(name))) continue
    let offset = match.index + match[1].length + 1
    for (const declaration of match[2].split(';')) {
      const motion = declaration.match(/^\s*(?:animation|transition)(?:-duration)?\s*:(.*)$/s)
      if (motion) {
        for (const item of motion[1].split(/,(?![^(]*\))/)) {
          const time = item.match(/(\d+(?:\.\d+)?)(ms|s)\b/)
          const ms = time ? (time[2] === 's' ? Number(time[1]) * 1000 : Number(time[1])) : 0
          if (ms <= 300) continue
          problems++
          const line = css.slice(0, offset).split('\n').length + (declaration.match(/^\s*/)[0].split('\n').length - 1)
          console.log(`C5 ${path.relative(ROOT, file)}:${line}  UI motion lasts 300ms or less (DESIGN.md > Motion)`)
          console.log(`    ${selector} { ${declaration.trim().slice(0, 100)} }  (${ms}ms)`)
          console.log('    Fix: shorten it to 300ms or less, or name it as an exception in DESIGN.md and LONG_MOTION_ALLOWED.')
        }
      }
      offset += declaration.length + 1
    }
  }
}

if (problems) {
  console.log(`\n${problems} design rule problem(s). See DESIGN.md.`)
  process.exit(1)
}
console.log('Design rules: no problems found.')
