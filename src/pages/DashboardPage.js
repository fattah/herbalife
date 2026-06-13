import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAgentStatus, getInitials, formatDateTime, sortAgentsByStatus } from '../utils/agentUtils';
import { Users, Map, Phone, Activity, TrendingUp, AlertCircle } from 'lucide-react';

export default function DashboardPage({ setActivePage }) {
  const [offices, setOffices] = useState([]);
  const [agentsMap, setAgentsMap] = useState({});
  const [callHistory, setCallHistory] = useState([]);
  const [callHistoryMap, setCallHistoryMap] = useState({});

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'agencyOffices'), snap => {
      setOffices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u2 = onSnapshot(collection(db, 'agents'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setAgentsMap(map);
    });
    const u3 = onSnapshot(collection(db, 'callHistory'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCallHistory(all);
      const map = {};
      all.forEach(c => {
        const key = c.officeId || c.agentId;
        if (!map[key]) map[key] = [];
        map[key].push(c);
      });
      setCallHistoryMap(map);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const enriched = useMemo(() =>
    offices.map(o => ({
      ...o,
      _agent: o.currentAgentId ? agentsMap[o.currentAgentId] : null,
      _status: getAgentStatus(callHistoryMap[o.id] || [])
    })),
    [offices, agentsMap, callHistoryMap]);

  const stats = useMemo(() => ({
    total: enriched.length,
    red: enriched.filter(o => o._status === 'red').length,
    yellow: enriched.filter(o => o._status === 'yellow').length,
    green: enriched.filter(o => o._status === 'green').length,
    callsThisWeek: callHistory.filter(c => {
      const d = new Date(c.createdAt);
      const now = new Date();
      return (now - d) / (1000 * 60 * 60 * 24) <= 7;
    }).length
  }), [enriched, callHistory]);

  const urgentOffices = useMemo(() =>
    sortAgentsByStatus(enriched).filter(o => o._status === 'red').slice(0, 8),
    [enriched]);

  const recentCalls = useMemo(() =>
    [...callHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [callHistory]);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-olive"><Users size={20} /></div>
          <div><div className="stat-value">{stats.total}</div><div className="stat-label">Agency Offices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><AlertCircle size={20} /></div>
          <div><div className="stat-value">{stats.red}</div><div className="stat-label">Overdue / Incomplete</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><Activity size={20} /></div>
          <div><div className="stat-value">{stats.yellow}</div><div className="stat-label">Need Follow-up</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><TrendingUp size={20} /></div>
          <div><div className="stat-value">{stats.green}</div><div className="stat-label">Calls Up to Date</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-olive"><Phone size={20} /></div>
          <div><div className="stat-value">{stats.callsThisWeek}</div><div className="stat-label">Calls This Week</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-olive"><Map size={20} /></div>
          <div><div className="stat-value">64</div><div className="stat-label">Districts Covered</div></div>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ paddingBottom: '12px' }}>
            <span className="card-title">Weekly Call Coverage</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--olive)' }}>
              {Math.round((stats.green / stats.total) * 100)}% complete
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: '8px' }}>
            <div style={{ height: '10px', background: 'var(--gray-100)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(stats.green / stats.total) * 100}%`, background: 'var(--green)', transition: 'width 0.5s ease' }} />
              <div style={{ width: `${(stats.yellow / stats.total) * 100}%`, background: 'var(--yellow)', transition: 'width 0.5s ease' }} />
              <div style={{ width: `${(stats.red / stats.total) * 100}%`, background: 'var(--red)', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
              {[
                { color: 'var(--green)', label: 'Completed', count: stats.green },
                { color: 'var(--yellow)', label: 'Follow-up', count: stats.yellow },
                { color: 'var(--red)', label: 'Overdue', count: stats.red },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    {item.label}: <strong style={{ color: 'var(--gray-700)' }}>{item.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔴 Needs Attention</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('agents')}>View All</button>
          </div>
          <div className="card-body" style={{ paddingTop: '12px' }}>
            {urgentOffices.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', padding: '20px' }}>
                All offices are up to date! 🎉
              </p>
            ) : (
              urgentOffices.map(office => (
                <div key={office.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px', borderRadius: 'var(--radius-sm)',
                  marginBottom: '4px', background: 'var(--red-light)'
                }}>
                  <div className="avatar-sm" style={{ background: 'var(--red)', fontSize: '11px', width: '30px', height: '30px' }}>
                    {office._agent ? getInitials(office._agent.firstName, office._agent.lastName) : '—'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }} className="truncate">
                      {office._agent ? `${office._agent.firstName} ${office._agent.lastName}` : 'Vacant'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-500)' }} className="truncate">
                      {office.thana}, {office.district}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Calls</span>
          </div>
          <div className="card-body" style={{ paddingTop: '12px' }}>
            {recentCalls.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', padding: '20px' }}>
                No calls logged yet.
              </p>
            ) : (
              recentCalls.map(call => (
                <div key={call.id} style={{
                  padding: '8px', borderBottom: '1px solid var(--gray-100)',
                  display: 'flex', alignItems: 'flex-start', gap: '10px'
                }}>
                  <div className="avatar-sm" style={{ fontSize: '11px', width: '30px', height: '30px', flexShrink: 0 }}>
                    {call.agentName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }} className="truncate">{call.agentName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDateTime(call.createdAt)}</div>
                    {call.note && (
                      <div style={{ fontSize: '11.5px', color: 'var(--gray-600)', marginTop: '2px' }} className="truncate">
                        {call.note}
                      </div>
                    )}
                  </div>
                  <span className={`badge badge-${call.status === 'complete' ? 'green' : call.status === 'followup' ? 'yellow' : 'red'}`}
                    style={{ fontSize: '10px', flexShrink: 0 }}>
                    {call.status === 'complete' ? 'Done' : call.status === 'followup' ? 'Follow-up' : 'Incomplete'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
