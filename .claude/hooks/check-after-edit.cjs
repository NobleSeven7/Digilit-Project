// Hook: after Claude edits a file in src/, run the quick checks that GitHub
// runs before publishing (unit tests + design rules). If one fails, Claude is
// told straight away, instead of the site failing to publish after a merge.
// Plain Node, no extra libraries. Takes about one second.
const { execSync } = require('child_process')
const path = require('path')

let input = ''
process.stdin.on('data', (chunk) => { input += chunk })
process.stdin.on('end', () => {
  let filePath = ''
  try { filePath = JSON.parse(input).tool_input?.file_path || '' } catch { process.exit(0) }

  const root = process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..')
  const relative = path.relative(root, path.resolve(root, filePath))
  // Only app code. Edits to notes, SQL or tests do not need these checks.
  if (!relative.startsWith('src' + path.sep)) process.exit(0)

  const failures = []
  for (const script of ['test:unit', 'check:design']) {
    try {
      execSync(`npm run --silent ${script}`, { cwd: root, stdio: 'pipe' })
    } catch (error) {
      const output = `${error.stdout || ''}${error.stderr || ''}`.trim().split('\n').slice(-25).join('\n')
      failures.push(`npm run ${script} failed:\n${output}`)
    }
  }
  if (failures.length) {
    // Exit code 2 = show this message to Claude so it fixes the problem.
    process.stderr.write(`Check after editing ${relative}:\n\n${failures.join('\n\n')}\n`)
    process.exit(2)
  }
  process.exit(0)
})
