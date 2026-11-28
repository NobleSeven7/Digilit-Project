// Photo proof: the carrier adds a photo of the parcel at pickup and at
// drop-off, so both sides (and the admin, if there is a problem) can see
// what state it was in. Photos are optional and private to the delivery.
import { useEffect, useState } from 'react'
import { serverEnabled, photoLink } from '../lib/server.js'
import { CameraIcon } from './Icons.jsx'

// A kept photo: in this browser it is a "data:" address; on the shared
// backend it is a private file, shown through a short-lived link.
function usePhotoSrc(value) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (!value) { setSrc(null); return undefined }
    if (value.startsWith('data:') || !serverEnabled) { setSrc(value); return undefined }
    photoLink(value).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [value])
  return src
}

function Slot({ kind, title, value, canAdd, busy, onPick }) {
  const src = usePhotoSrc(value)
  const inputId = `photo-input-${kind}`
  return (
    <div className="min-w-0">
      <p className="stamp text-sm">{title}</p>
      {value ? (
        src
          ? <img src={src} alt={`The parcel ${title.toLowerCase()}`} data-testid={`photo-${kind}`}
              className="mt-2 aspect-[4/3] w-full rounded-lg border border-line bg-sunk object-cover" />
          : <div className="mt-2 aspect-[4/3] w-full rounded-lg bg-sunk" aria-label="Loading photo" />
      ) : (
        <div className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-muted bg-surface p-3 text-center text-sm text-muted">
          {canAdd ? 'No photo yet' : 'No photo'}
        </div>
      )}
      {canAdd && (
        // A label styled as a button opens the camera (or the photo library).
        <label htmlFor={inputId} className={`btn btn-secondary mt-2 w-full ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <CameraIcon size={20} /> {busy ? 'Saving…' : value ? 'Replace photo' : 'Add photo'}
          <input id={inputId} data-testid={inputId} type="file" accept="image/*" capture="environment"
            className="sr-only" disabled={busy}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onPick(kind, file) }} />
        </label>
      )}
    </div>
  )
}

export default function PhotoProof({ delivery, isCarrier, canAddPickup, canAddDropoff, notReady, onAdd, problem }) {
  const [busy, setBusy] = useState(null) // 'pickup' | 'dropoff' while saving
  async function handlePick(kind, file) {
    setBusy(kind)
    await onAdd(kind, file)
    setBusy(null)
  }
  return (
    <section className="card" data-testid="photo-proof">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <CameraIcon size={22} /> Photo proof
      </h2>
      <p className="mt-1 text-sm text-muted">
        {isCarrier
          ? 'Take a photo of the parcel when you pick it up and when you hand it over. It helps if anyone reports damage later.'
          : 'The carrier can add a photo of the parcel at pickup and at drop-off. Only the two of you and the admin can see them.'}
      </p>
      {notReady ? (
        <p className="mt-3 rounded-lg bg-sunk px-3 py-3">
          Photos are not switched on yet. The team needs to run the database step for them.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Slot kind="pickup" title="At pickup" value={delivery.pickupPhoto}
            canAdd={isCarrier && canAddPickup} busy={busy === 'pickup'} onPick={handlePick} />
          <Slot kind="dropoff" title="At drop-off" value={delivery.dropoffPhoto}
            canAdd={isCarrier && canAddDropoff} busy={busy === 'dropoff'} onPick={handlePick} />
        </div>
      )}
      {problem && <p role="alert" className="mt-3 font-bold text-fail">{problem}</p>}
    </section>
  )
}
