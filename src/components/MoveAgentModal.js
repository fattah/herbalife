import React, { useState } from 'react';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { bangladeshData, getThanasForDistrict } from '../data/bangladeshData';
import { X, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MoveAgentModal({ agent, office, onClose }) {
  const [district, setDistrict] = useState('');
  const [thana, setThana] = useState('');
  const [thanas, setThanas] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleDistrictChange = (e) => {
    const d = e.target.value;
    setDistrict(d);
    setThana('');
    setThanas(getThanasForDistrict(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!district || !thana) { toast.error('Select district and thana'); return; }
    if (district === office.district && thana === office.thana) {
      toast.error('Agent is already in this thana'); return;
    }
    setSaving(true);
    try {
      // 1. Vacate the old office
      await updateDoc(doc(db, 'agencyOffices', office.id), { currentAgentId: null });

      // 2. Find or create the target office
      const snap = await getDocs(
        query(collection(db, 'agencyOffices'),
          where('district', '==', district),
          where('thana', '==', thana))
      );

      let newOfficeId;
      if (!snap.empty) {
        newOfficeId = snap.docs[0].id;
        // If the target office already has an agent, displace them
        const existingAgentId = snap.docs[0].data().currentAgentId;
        if (existingAgentId && existingAgentId !== agent.id) {
          await updateDoc(doc(db, 'agents', existingAgentId), { currentOfficeId: null });
        }
        await updateDoc(doc(db, 'agencyOffices', newOfficeId), { currentAgentId: agent.id });
      } else {
        const officeRef = await addDoc(collection(db, 'agencyOffices'), {
          district,
          thana,
          currentAgentId: agent.id,
          createdAt: new Date().toISOString()
        });
        newOfficeId = officeRef.id;
      }

      // 3. Update agent's current office
      await updateDoc(doc(db, 'agents', agent.id), {
        currentOfficeId: newOfficeId,
        updatedAt: new Date().toISOString()
      });

      toast.success(`${agent.firstName} moved to ${thana}, ${district}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to move agent: ' + (err.message || err.code || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <ArrowRightLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Move Agent
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{
              background: 'var(--olive-xfaint)', border: '1px solid var(--olive-pale)',
              borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '16px'
            }}>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                Moving <strong>{agent.firstName} {agent.lastName}</strong>
              </p>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Current: {office.thana}, {office.district}
              </p>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '14px' }}>
              The old office will remain vacant with its full call history intact.
            </p>

            <div className="form-group">
              <label className="form-label">New District <span className="req">*</span></label>
              <select className="form-select" value={district} onChange={handleDistrictChange} required>
                <option value="">Select district</option>
                {bangladeshData.map(d => (
                  <option key={d.district} value={d.district}>{d.district}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">New Thana <span className="req">*</span></label>
              <select className="form-select" value={thana} onChange={e => setThana(e.target.value)} required disabled={!district}>
                <option value="">Select thana</option>
                {thanas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner"></span> Moving...</> : 'Move Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
