// Display helpers shared by the disputes board and detail page. The keys
// match the enums in server/models/Dispute.js.

export const DISPUTE_TYPE_LABELS = {
  too_small: 'Too small',
  too_big: 'Too big',
  no_item: 'No item',
}

export const DISPUTE_STATUS_LABELS = {
  new: 'New',
  underway: 'Underway',
  resolved: 'Resolved',
}

export function formatDisputeDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function pickedUpByName(dispute) {
  const user = dispute.picked_up_by
  return user ? `${user.first_name} ${user.last_name}` : 'Not picked up'
}
