// One row that shows whether a carrier passed or failed one matching rule.
// Pass/fail is shown with an icon AND a word, never by colour alone.

export default function RuleCheck({ rule }) {
  return (
    <li
      data-rule={rule.key}
      data-pass={rule.pass}
      className={`flex gap-3 rounded-lg px-3 py-2 ${rule.pass ? 'bg-brand-tint' : 'bg-fail-tint'}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          rule.pass ? 'bg-brand' : 'bg-fail'
        }`}
      >
        {rule.pass ? '✓' : '✕'}
      </span>
      <div>
        <p className="font-bold">
          {rule.label}: <span className={rule.pass ? 'text-brand' : 'text-fail'}>{rule.pass ? 'Pass' : 'Fail'}</span>
        </p>
        <p className="text-sm text-ink/80">{rule.detail}</p>
      </div>
    </li>
  )
}
