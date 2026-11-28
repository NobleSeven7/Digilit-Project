// Messages between the sender and the carrier of one delivery, for example
// to agree where to meet at pickup, without swapping phone numbers.
// Only those two can write; the admin can read them when checking a dispute.
import { useState } from 'react'
import { MAX_MESSAGE } from '../data/constants.js'
import { formatShort } from '../lib/format.js'
import { ChatIcon } from './Icons.jsx'

export default function DeliveryChat({ messages, me, canWrite, closed, notReady, onSend, people }) {
  const [text, setText] = useState('')
  const trimmed = text.trim()

  function handleSubmit(e) {
    e.preventDefault()
    if (!trimmed) return
    onSend(trimmed.slice(0, MAX_MESSAGE))
    setText('')
  }

  return (
    <section className="card" data-testid="chat">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <ChatIcon size={22} /> Messages
      </h2>
      <p className="mt-1 text-sm text-muted">
        Only {people} (and the admin, who checks problems) can read these. Agree where and when
        to meet here, with no need to share phone numbers.
      </p>

      {notReady ? (
        <p className="mt-3 rounded-lg bg-sunk px-3 py-3" data-testid="chat-not-ready">
          Chat is not switched on yet. The team needs to run the database step for it.
        </p>
      ) : (
        <>
          {messages.length === 0 ? (
            <p className="mt-3 text-muted" data-testid="chat-empty">No messages yet.</p>
          ) : (
            <ol className="mt-3 space-y-2" aria-label="Messages" data-testid="chat-list">
              {messages.map((m) => {
                const mine = me && m.authorName === me.name && m.authorRole === me.role
                return (
                  <li key={m.id} data-testid="chat-message"
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? 'ml-auto bg-brand-tint' : 'bg-sunk'}`}>
                    <p className="text-sm">
                      <strong>{mine ? 'You' : m.authorName}</strong>
                      <span className="text-muted"> ({m.authorRole}), {formatShort(m.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                  </li>
                )
              })}
            </ol>
          )}

          {canWrite && !closed && (
            <form className="mt-4" onSubmit={handleSubmit}>
              <label className="label" htmlFor="chat-input">Write a message</label>
              <textarea id="chat-input" data-testid="chat-input" className="field min-h-20" rows={2}
                maxLength={MAX_MESSAGE} value={text} onChange={(e) => setText(e.target.value)}
                enterKeyHint="send" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted tabular-nums">{text.length} / {MAX_MESSAGE}</span>
                <button type="submit" className="btn btn-primary" data-testid="chat-send" disabled={!trimmed}>
                  Send message
                </button>
              </div>
            </form>
          )}
          {canWrite && closed && (
            <p className="mt-3 text-sm text-muted">This delivery has ended, so the chat is closed.</p>
          )}
        </>
      )}
    </section>
  )
}
