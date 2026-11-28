// Turns the app's records into database rows and back.
//
// The app keeps its data as { journeys, shipments, deliveries } with names
// like "weightKg". The database uses names like "weight_kg", and keeps the
// pickup and delivery codes in their own table (delivery_codes). Any field
// without its own column goes into the row's "extra" column, so nothing the
// app saves is lost.
//
// No network here, so the unit tests can check it (npm run test:unit).

// App field name -> database column, for each table.
const COLUMNS = {
  journeys: {
    id: 'id', carrierName: 'carrier_name', origin: 'origin', destination: 'destination',
    departure: 'departure', vehicleType: 'vehicle_type', spareKg: 'spare_kg', status: 'status',
  },
  shipments: {
    id: 'id', senderName: 'sender_name', origin: 'origin', destination: 'destination',
    weightKg: 'weight_kg', itemType: 'item_type', deadline: 'deadline', status: 'status',
    matchingMs: 'matching_ms', rejectedJourneyIds: 'rejected_journey_ids',
    aiCheck: 'ai_check', aiFlag: 'ai_flag', createdAt: 'created_at',
  },
  deliveries: {
    id: 'id', shipmentId: 'shipment_id', journeyId: 'journey_id', price: 'price',
    senderAccepted: 'sender_accepted', carrierAccepted: 'carrier_accepted',
    wrongAttempts: 'wrong_attempts', wrongPickupAttempts: 'wrong_pickup_attempts',
    status: 'status', escrow: 'escrow', disputeReason: 'dispute_reason', expired: 'expired',
    createdAt: 'created_at', deliveredAt: 'delivered_at',
  },
  // Chat messages and ratings (database/05-upgrades.sql). The owner columns
  // (author_id, rater_id) are filled in by the server.
  messages: {
    id: 'id', deliveryId: 'delivery_id', authorName: 'author_name', authorRole: 'author_role',
    body: 'body', createdAt: 'created_at',
  },
  ratings: {
    id: 'id', deliveryId: 'delivery_id', raterRole: 'rater_role', raterName: 'rater_name',
    ratedName: 'rated_name', stars: 'stars', comment: 'comment', createdAt: 'created_at',
  },
}

// Kept in the delivery_codes table, never in "extra". The owner columns
// (sender_id, carrier_id) are never sent: the server fills them in.
const CODE_FIELDS = ['pickupOtp', 'deliveryOtp']

export const TABLES = ['journeys', 'shipments', 'deliveries', 'messages', 'ratings']

// Messages and ratings are only ever added, never changed or removed, and
// their tables have no "extra" column.
const ADD_ONLY = ['messages', 'ratings']

// One app record -> one row for its table.
export function toRow(table, record) {
  const columns = COLUMNS[table]
  const row = {}
  const extra = {}
  for (const [field, value] of Object.entries(record)) {
    if (table === 'deliveries' && CODE_FIELDS.includes(field)) continue
    if (columns[field]) row[columns[field]] = value === undefined ? null : value
    else if (value !== undefined) extra[field] = value
  }
  if (!ADD_ONLY.includes(table)) row.extra = extra
  return row
}

// One row from the database -> the app's record.
export function fromRow(table, row) {
  const columns = COLUMNS[table]
  const record = {}
  for (const [field, column] of Object.entries(columns)) {
    if (column in row) record[field] = row[column]
  }
  // Numbers come back from the database as numbers, but "numeric" columns
  // can arrive as text; the app does arithmetic on them.
  for (const field of ['spareKg', 'weightKg', 'price', 'matchingMs']) {
    if (typeof record[field] === 'string') record[field] = Number(record[field])
  }
  return { ...record, ...(row.extra || {}) }
}

// The codes row for one delivery (or null if it has no codes yet).
export function toCodesRow(delivery) {
  if (delivery.pickupOtp == null && delivery.deliveryOtp == null) return null
  return { delivery_id: delivery.id, pickup_otp: delivery.pickupOtp ?? null, delivery_otp: delivery.deliveryOtp ?? null }
}

// All rows from the server -> the app's state. Codes join their delivery;
// a delivery whose codes this person may not read simply has none.
export function stateFromRows({ journeys, shipments, deliveries, codes, messages = [], ratings = [] }) {
  const codesById = new Map((codes || []).map((c) => [c.delivery_id, c]))
  const byCreated = (a, b) => String(a.created_at).localeCompare(String(b.created_at))
  return {
    journeys: [...journeys].sort(byCreated).map((r) => fromRow('journeys', r)),
    shipments: [...shipments].sort(byCreated).map((r) => fromRow('shipments', r)),
    deliveries: [...deliveries].sort(byCreated).map((r) => {
      const c = codesById.get(r.id)
      return { ...fromRow('deliveries', r), pickupOtp: c?.pickup_otp ?? null, deliveryOtp: c?.delivery_otp ?? null }
    }),
    messages: [...messages].sort(byCreated).map((r) => fromRow('messages', r)),
    ratings: [...ratings].sort(byCreated).map((r) => fromRow('ratings', r)),
  }
}

// What changed between two states, per table: new rows to add, changed
// rows to update and ids to remove, plus the codes rows to write. Only
// changed records are sent. New and changed rows are kept apart because the
// server has different rules for adding a row and for changing one.
export function changesBetween(before, after) {
  const changes = { insert: {}, update: {}, remove: {}, codes: [] }
  for (const table of TABLES) {
    const was = before[table] || []
    const is = after[table] || []
    const old = new Map(was.map((r) => [r.id, JSON.stringify(r)]))
    const now = new Set(is.map((r) => r.id))
    changes.insert[table] = is.filter((r) => !old.has(r.id)).map((r) => toRow(table, r))
    const addOnly = ADD_ONLY.includes(table)
    changes.update[table] = addOnly ? [] : is
      .filter((r) => old.has(r.id) && old.get(r.id) !== JSON.stringify(r))
      .map((r) => toRow(table, r))
    // (A removed delivery takes its messages and ratings with it on the server.)
    changes.remove[table] = addOnly ? [] : was.map((r) => r.id).filter((id) => !now.has(id))
  }
  const oldDeliveries = new Map(before.deliveries.map((d) => [d.id, d]))
  for (const d of after.deliveries) {
    const was = oldDeliveries.get(d.id)
    if (was && was.pickupOtp === d.pickupOtp && was.deliveryOtp === d.deliveryOtp) continue
    const row = toCodesRow(d)
    if (row) changes.codes.push(row)
  }
  return changes
}

export const hasChanges = (c) => c.codes.length > 0
  || TABLES.some((t) => c.insert[t].length + c.update[t].length + c.remove[t].length > 0)
