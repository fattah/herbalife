// Returns 'red' | 'yellow' | 'green'
export const getAgentStatus = (callHistory = []) => {
  if (!callHistory || callHistory.length === 0) return 'red';

  const sorted = [...callHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latest = sorted[0];

  const now = new Date();
  const callDate = new Date(latest.createdAt);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((now - callDate) / msPerDay);

  if (latest.status === 'incomplete' || daysDiff >= 7) return 'red';
  if (latest.status === 'followup') return 'yellow';
  if (latest.status === 'complete') return 'green';
  return 'red';
};

export const getStatusBadgeProps = (status) => {
  switch (status) {
    case 'red': return { label: 'Overdue', className: 'badge-red' };
    case 'yellow': return { label: 'Follow-up Needed', className: 'badge-yellow' };
    case 'green': return { label: 'Up to Date', className: 'badge-green' };
    default: return { label: 'No Calls', className: 'badge-gray' };
  }
};

export const getCallStatusLabel = (status) => {
  switch (status) {
    case 'complete': return { label: 'Completed', class: 'badge-green' };
    case 'followup': return { label: 'Follow-up', class: 'badge-yellow' };
    case 'incomplete': return { label: 'Incomplete', class: 'badge-red' };
    default: return { label: status, class: 'badge-gray' };
  }
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

export const getInitials = (firstName = '', lastName = '') => {
  return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || '??';
};

export const sortAgentsByStatus = (agents) => {
  const order = { red: 0, yellow: 1, green: 2, gray: 3 };
  return [...agents].sort((a, b) => {
    const sa = order[a._status] ?? 3;
    const sb = order[b._status] ?? 3;
    if (sa !== sb) return sa - sb;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
};

export const getMapPinColor = (status) => {
  switch (status) {
    case 'red': return '#DC2626';
    case 'yellow': return '#D97706';
    case 'green': return '#16A34A';
    default: return '#9CA3AF';
  }
};
