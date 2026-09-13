export const CHANNELS = { amazon: 'Amazon', walmart: 'Walmart' };
export const PROGRAMS = {
  amazon: { seller: 'Seller Central', vendor: 'Vendor Central', fba: 'FBA' },
  walmart: { marketplace: 'Marketplace', wfs: 'WFS' }
};
export const STAGES = { active: 'Already selling', planning: 'Preparing to launch', paused: 'Paused or restricted' };
export const TIMING = { soon: 'Ready to make improvements', urgent: 'An issue is blocking sales', exploring: 'Exploring options' };
export const ISSUES = {
  listings: { name: 'Listings', desc: 'Content, visibility or item setup', focus: 'Listing content & availability', action: 'Review the affected product pages, content gaps and any item setup or suppression messages.' },
  advertising: { name: 'Advertising', desc: 'Campaigns, spend or performance', focus: 'Advertising performance', action: 'Review campaign structure, search terms, spend and results alongside product margins and availability.' },
  inventory: { name: 'Inventory', desc: 'Stockouts, forecasts or excess stock', focus: 'Inventory planning', action: 'Compare sales history, stock on hand and inbound lead times to identify replenishment priorities.' },
  fulfillment: { name: 'Fulfillment', desc: 'Inbound shipments, fees or delivery', focus: 'Fulfillment operations', action: 'Review inbound shipment records, receiving discrepancies, fulfillment fees and delivery processes.' },
  reimbursements: { name: 'Reimbursements', desc: 'Returns, settlements or discrepancies', focus: 'Reconciliation & claim eligibility', action: 'Reconcile settlement, returns and shipment records, then assess any documented discrepancies against applicable claim rules.' },
  compliance: { name: 'Compliance', desc: 'Account health or policy notices', focus: 'Account health & policy notices', action: 'Review the specific notices, affected items and requested documentation to identify the next operational steps.' },
  unsure: { name: 'Not sure yet', focus: 'A broad channel review', action: 'Start with how the account is operating, what has changed and where you are seeing friction.' }
};
export const BOOKING_URL = 'https://www.simpleconsulting.ca/booking.html#booking';
export const EMAIL = 'scott@simpleconsulting.ca';
export const RECOVERY_NOTE = 'Reimbursements are not guaranteed. Eligibility depends on the records, applicable marketplace policies and deadlines; the marketplace decides whether a claim is approved.';
export function freshState() { return { step: 0, channels: [], programs: { amazon: [], walmart: [] }, issues: [], stage: 'active', timing: 'soon' }; }
export function cleanState(raw) {
  const s = freshState();
  if (!raw || typeof raw !== 'object') return s;
  s.channels = Object.keys(CHANNELS).filter(k => Array.isArray(raw.channels) && raw.channels.includes(k));
  for (const channel of s.channels) s.programs[channel] = Object.keys(PROGRAMS[channel]).filter(k => Array.isArray(raw.programs?.[channel]) && raw.programs[channel].includes(k));
  s.issues = Object.keys(ISSUES).filter(k => Array.isArray(raw.issues) && raw.issues.includes(k));
  if (s.issues.includes('unsure')) s.issues = ['unsure'];
  if (Object.hasOwn(STAGES, raw.stage)) s.stage = raw.stage;
  if (Object.hasOwn(TIMING, raw.timing)) s.timing = raw.timing;
  if (s.channels.length) s.step = raw.step === 2 && s.issues.length ? 2 : raw.step >= 1 ? 1 : 0;
  return s;
}
function joinWords(items) { return items.length < 2 ? (items[0] || '') : items.slice(0, -1).join(', ') + ' and ' + items.at(-1); }
export function assess(state) {
  const s = cleanState(state);
  if (!s.channels.length || !s.issues.length) throw new Error('Choose channels and needs before generating a summary.');
  const channels = s.channels.map(k => CHANNELS[k] + (s.programs[k].length ? ' (' + s.programs[k].map(p => PROGRAMS[k][p]).join(', ') + ')' : ' (account type to confirm)'));
  const names = s.issues.map(k => ISSUES[k].name);
  const summary = s.issues.includes('unsure')
    ? `You’re looking for help identifying where to focus across ${joinWords(channels)}.`
    : `You’re looking for support with ${joinWords(names.map(n => n.toLowerCase()))} across ${joinWords(channels)}.`;
  const order = ['compliance', 'listings', 'inventory', 'fulfillment', 'reimbursements', 'advertising', 'unsure'];
  const priorities = order.filter(k => s.issues.includes(k)).slice(0, 3);
  const recommendMessage = s.timing === 'exploring' && (s.issues.length === 1 || s.issues.includes('unsure')) && s.stage !== 'paused';
  const route = recommendMessage ? 'message' : 'review';
  let reason = s.issues.length >= 3 ? 'Several areas are connected. A conversation can help establish priorities and the records needed for a closer look.' : 'Talk through the selected issues, clarify what is happening and agree on what to review first.';
  if (s.stage === 'planning') reason = 'Talk through your planned launch, the selected channels and the setup or operating support you may need.';
  if (s.timing === 'urgent' || s.stage === 'paused') reason = 'Start with the issue affecting sales and the relevant account notices. A review can help clarify the available next steps.';
  if (recommendMessage) reason = 'You’re exploring a focused question. Send the summary to Scott to start with a practical conversation by email.';
  const subject = 'Channel assessment — ' + s.channels.map(k => CHANNELS[k]).join(' + ');
  const text = [
    'Simple Consulting — Channel needs summary', '', summary,
    'Business stage: ' + STAGES[s.stage], 'Timing: ' + TIMING[s.timing],
    'Areas selected: ' + names.join(', '), '', 'Suggested starting points:',
    ...priorities.map((k, i) => `${i + 1}. ${ISSUES[k].focus}: ${ISSUES[k].action}`), '',
    'Next step: ' + (route === 'message' ? 'Send a message to discuss the needs.' : 'Book a free channel review.'),
    'This summary is based on selected answers. No account records have been reviewed.',
    ...(s.issues.includes('reimbursements') ? [RECOVERY_NOTE] : [])
  ].join('\n');
  const message = `Hi Scott,\n\nI’d like to discuss support for my marketplace channels. Here is my needs summary:\n\n${text}\n\nPlease let me know what information would be useful to review next.\n\nThanks,`;
  return { channels, names, summary, priorities, route, reason, subject, text, message, recovery: s.issues.includes('reimbursements') };
}
