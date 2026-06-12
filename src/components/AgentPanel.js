import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, Phone, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getInitials, getCallStatusLabel, formatDateTime, getStatusBadgeProps, getAgentStatus } from '../utils/agentUtils';
import toast from 'react-hot-toast';

export default function AgentPanel({ agent, onClose }) {
  const [callHistory, setCallHistory] = useState([]);
  const [note, setNote] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState('');

  const isOpen = !!agent;

  useEffect(() => {
    if (!agent) return;
    const q = query(
      collection(db, 'callHistory'),
      where('agentId', '==', agent.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setCallHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [agent?.id]);

  const handlePhoneClick = (phone) => {
    setSelectedPhone(phone);
    setShowForm(true);
  };

  const handleSaveCall = async () => {
    if (!callStatus) { toast.error('Please select a call status'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'callHistory'), {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        phone: selectedPhone,
        note: note.trim(),
        status: callStatus,
        createdAt: new Date().toISOString(),
      });
      setNote('');
      setCallStatus('');
      setShowForm(false);
      setSelectedPhone('');
      toast.success('Call logged successfully');
    } catch (err) {
      toast.error('Failed to save call log');
    } finally {
      setSaving(false);
    }
  };

  const phones = agent ? [agent.phone1, agent.phone2, agent.phone3].filter(Boolean) : [];
  const agentStatus = agent ? getAgentStatus(callHistory) : 'gray';
  const statusProps = getStatusBadgeProps(agentStatus);

  return (
    <>
      <div className={`panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`slide-panel ${isOpen ? 'open' : ''}`}>
        {agent && (
          <>
            <div className="panel-header">
              <div className="panel-avatar">
                {agent.photoURL
                  ? <img src={agent.photoURL} alt={agent.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(agent.firstName, agent.lastName)
                }
              </div>
              <div className="panel-info">
                <div className="panel-name">{agent.firstName} {agent.lastName}</div>
                <div className="panel-sub">{agent.thana}, {agent.district}</div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${statusProps.className}`}>
                    <span className={`status-dot dot-${agentStatus}`} style={{ width: '7px', height: '7px' }}></span>
                    {statusProps.label}
                  </span>
                </div>
                <div className="panel-phones">
                  {phones.map((phone, i) => (
                    <button key={i} className="phone-chip" onClick={() => handlePhoneClick(phone)}>
                      <Phone size={11} />
                      {phone}
                    </button>
                  ))}
                </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${st.class}`}>{st.label}</span>
                          {entry.phone && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{entry.phone}</span>}
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
