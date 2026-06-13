import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, Phone, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getInitials, getCallStatusLabel, formatDateTime, getStatusBadgeProps, getAgentStatus } from '../utils/agentUtils';
import toast from 'react-hot-toast';

export default function AgentPanel({ office, agentsMap, onClose }) {
  const [callHistory, setCallHistory] = useState([]);
  const [note, setNote] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const isOpen = !!office;

  useEffect(() => {
    if (!office) return;
    let unsub;
    let mounted = true;
    const connect = () => {
      const q = query(
        collection(db, 'callHistory'),
        where('officeId', '==', office.id),
        orderBy('createdAt', 'desc')
      );
      unsub = onSnapshot(
        q,
        snap => setCallHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => {
          console.error('CallHistory panel listener error:', err);
          if (mounted) setTimeout(connect, 5000);
        }
      );
    };
    connect();
    return () => { mounted = false; unsub?.(); };
  }, [office?.id]);

  const currentAgent = office?.currentAgentId ? agentsMap?.[office.currentAgentId] : null;
  const agentStatus = getAgentStatus(callHistory);
  const statusProps = getStatusBadgeProps(agentStatus);

  // Build all agent groups: current agent first, then past agents derived from call history
  const agentGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();

    if (currentAgent) {
      seen.add(currentAgent.id);
      groups.push({
        agentId: currentAgent.id,
        name: `${currentAgent.firstName} ${currentAgent.lastName}`,
        phones: [currentAgent.phone1, currentAgent.phone2, currentAgent.phone3].filter(Boolean),
        isCurrent: true
      });
    }

    callHistory.forEach(c => {
      if (c.agentId && !seen.has(c.agentId)) {
        seen.add(c.agentId);
        const agent = agentsMap?.[c.agentId];
        groups.push({
          agentId: c.agentId,
          name: agent ? `${agent.firstName} ${agent.lastName}` : c.agentName,
          phones: agent ? [agent.phone1, agent.phone2, agent.phone3].filter(Boolean) : [],
          isCurrent: false
        });
      }
    });

    return groups;
  }, [currentAgent, callHistory, agentsMap]);

  const handlePhoneClick = (phone, agentId) => {
    setSelectedPhone(phone);
    setSelectedAgentId(agentId);
    setShowForm(true);
  };

  const handleSaveCall = async () => {
    if (!callStatus) { toast.error('Please select a call status'); return; }
    if (!office) return;
    setSaving(true);
    try {
      const callingAgent = agentsMap?.[selectedAgentId] || currentAgent;
      await addDoc(collection(db, 'callHistory'), {
        officeId: office.id,
        agentId: selectedAgentId || office.currentAgentId || '',
        agentName: callingAgent ? `${callingAgent.firstName} ${callingAgent.lastName}` : '',
        phone: selectedPhone,
        note: note.trim(),
        status: callStatus,
        createdAt: new Date().toISOString(),
      });
      setNote('');
      setCallStatus('');
      setShowForm(false);
      setSelectedPhone('');
      setSelectedAgentId('');
      toast.success('Call logged successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save call log: ' + (err.message || err.code || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`slide-panel ${isOpen ? 'open' : ''}`}>
        {office && (
          <>
            <div className="panel-header">
              <div className="panel-avatar">
                {currentAgent?.photoURL
                  ? <img src={currentAgent.photoURL} alt={currentAgent.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : currentAgent ? getInitials(currentAgent.firstName, currentAgent.lastName) : '—'
                }
              </div>
              <div className="panel-info">
                <div className="panel-name">
                  {currentAgent ? `${currentAgent.firstName} ${currentAgent.lastName}` : 'Vacant'}
                </div>
                <div className="panel-sub">{office.thana}, {office.district}</div>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge ${statusProps.className}`}>
                    <span className={`status-dot dot-${agentStatus}`} style={{ width: '7px', height: '7px' }}></span>
                    {statusProps.label}
                  </span>
                </div>

                {/* All agents grouped with their phones */}
                {agentGroups.map(group => (
                  <div key={group.agentId} style={{ marginTop: '8px' }}>
                    {agentGroups.length > 1 && (
                      <div style={{ fontSize: '10px', color: 'var(--gray-400)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {group.isCurrent ? 'Current' : 'Previous'} — {group.name}
                      </div>
                    )}
                    <div className="panel-phones">
                      {group.phones.map((phone, i) =>
                        group.isCurrent ? (
                          <a key={i} className="phone-chip" href={`tel:${phone}`}
                            onClick={() => handlePhoneClick(phone, group.agentId)}>
                            <Phone size={11} />{phone}
                          </a>
                        ) : (
                          <a key={i} className="phone-chip" href={`tel:${phone}`}
                            style={{ opacity: 0.65 }} title={`Previous agent: ${group.name}`}>
                            <Phone size={11} />{phone}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="panel-close" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="panel-body">
              {showForm && (
                <div className="call-log-form">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--olive-dark)' }}>
                      <Phone size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                      Logging call for {selectedPhone}
                    </span>
                    <button className="btn-ghost btn btn-sm" onClick={() => setShowForm(false)}><X size={14} /></button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Call Outcome <span className="req">*</span></label>
                    <div className="call-status-btns">
                      <button
                        className={`call-status-btn ${callStatus === 'complete' ? 'active-complete' : ''}`}
                        onClick={() => setCallStatus('complete')}
                      >
                        <CheckCircle size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Completed
                      </button>
                      <button
                        className={`call-status-btn ${callStatus === 'followup' ? 'active-followup' : ''}`}
                        onClick={() => setCallStatus('followup')}
                      >
                        <Clock size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Need Follow-up
                      </button>
                      <button
                        className={`call-status-btn ${callStatus === 'incomplete' ? 'active-incomplete' : ''}`}
                        onClick={() => setCallStatus('incomplete')}
                      >
                        <AlertCircle size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Incomplete
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Call Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Write your call notes here..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={handleSaveCall} disabled={saving}>
                    {saving ? <><span className="spinner"></span> Saving...</> : 'Save Call Log'}
                  </button>
                </div>
              )}

              <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--gray-700)', marginBottom: '12px' }}>
                Call History ({callHistory.length})
              </div>

              {callHistory.length === 0 ? (
                <div className="call-no-history">
                  <Phone size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  No calls logged yet.<br />Tap a phone number above to log a call.
                </div>
              ) : (
                callHistory.map(entry => {
                  const st = getCallStatusLabel(entry.status);
                  return (
                    <div key={entry.id} className="call-entry">
                      <div className="call-entry-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`badge ${st.class}`}>{st.label}</span>
                          {entry.phone && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{entry.phone}</span>}
                          {entry.agentName && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>— {entry.agentName}</span>}
                        </div>
                        <span className="call-entry-time">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      {entry.note && <p className="call-note-text">{entry.note}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
