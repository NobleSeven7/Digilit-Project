// One row that shows whether a carrier passed or failed one matching rule.
// Pass/fail is shown with an icon AND a word, never by colour alone.

import { CheckIcon, CrossIcon } from './Icons.jsx'

export default function RuleCheck({ rule }) {
  return (
    <li
      data-rule={rule.key}
      data-pass={rule.pass}
      className={`flex flex-wrap gap-x-3 gap-y-1 rounded-lg px-3 py-2 ${rule.pass ? 'bg-brand-tint' : 'bg-fail-tint'}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          rule.pass ? 'bg-brand text-white' : 'bg-fail text-surface'
        }`}
      >
        {rule.pass ? <CheckIcon size={14} /> : <CrossIcon size={14} />}
      </span>
      {/* The text takes the room beside the icon while that room is at least
          12rem; with very large text (12rem grows with it) it moves under the
          icon and uses the full row, so words do not have to break.
          overflow-wrap is only a last resort for a single word wider than that. */}
      <div className="min-w-0 grow basis-[min(100%,12rem)] [overflow-wrap:anywhere]">
        <p className="stamp">
          {rule.label}: <span className={rule.pass ? 'text-brand-ink' : 'text-fail'}>{rule.pass ? 'Pass' : 'Fail'}</span>
        </p>
        <p className="text-sm text-ink/80">{rule.detail}</p>
      </div>
    </li>
  )
}
