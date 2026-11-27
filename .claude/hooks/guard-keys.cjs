// Hook: before Claude writes or edits a file, stop it if the file is a private
// settings file (.env.local) or the new text looks like a secret. This makes
// the project rule "no keys in code" a hard stop.
// Plain Node, no extra libraries.
const path = require('path')

// Private settings files. .env.example and .env.e2e are fine: they hold no
// real values (the guard below still checks what goes into them).
const PRIVATE_FILES = /(^|[\\/])\.env(\.local|\.production|\.development)?(\.local)?$/

// Things that look like real secrets. Placeholders such as
// "phc_your_project_token" are short or contain words, so they pass.
const SECRET_PATTERNS = [
  ['a Make.com webhook address', /hook\.[a-z0-9]+\.make\.com\/[a-z0-9]{10,}/i],
  ['a Supabase secret key', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['a Supabase service_role key or other signed token', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ['a PostHog personal API key', /phx_[A-Za-z0-9]{20,}/],
  ['a real PostHog project token', /phc_[A-Za-z0-9]{30,}/],
  ['a GitHub token', /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ['an API secret key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
]

let input = ''
process.stdin.on('data', (chunk) => { input += chunk })
process.stdin.on('end', () => {
  let tool
  try { tool = JSON.parse(input).tool_input || {} } catch { process.exit(0) }

  const filePath = tool.file_path || ''
  const block = (reason) => {
    // Exit code 2 = cancel the edit and tell Claude why.
    process.stderr.write(`Blocked by the key guard: ${reason}\n` +
      'Keys belong in .env.local on your own computer or in GitHub secrets, never in files Claude writes.\n')
    process.exit(2)
  }

  if (PRIVATE_FILES.test(filePath)) block(`${path.basename(filePath)} is a private settings file.`)

  // The new text, for Write (content), Edit (new_string) and MultiEdit (edits).
  const text = [tool.content, tool.new_string, ...(tool.edits || []).map((e) => e.new_string)]
    .filter(Boolean).join('\n')
  for (const [name, pattern] of SECRET_PATTERNS) {
    if (pattern.test(text)) block(`the text for ${path.basename(filePath) || 'this file'} looks like ${name}.`)
  }
  process.exit(0)
})
