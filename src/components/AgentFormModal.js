import React, { useState, useEffect, useRef } from 'react';
import { doc, addDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { bangladeshData, getThanasForDistrict } from '../data/bangladeshData';
import { X, Upload, User } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = {
  firstName: '', lastName: '', phone1: '', phone2: '', phone3: '',
  district: '', thana: '', photoURL: ''
};

export default function AgentFormModal({ agent, office, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [thanas, setThanas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileRef = useRef();
  const isEdit = !!agent?.id;

  useEffect(() => {
    if (agent) {
      setForm({
        firstName: agent.firstName || '',
        lastName: agent.lastName || '',
        phone1: agent.phone1 || '',
        phone2: agent.phone2 || '',
        phone3: agent.phone3 || '',
        district: '',
        thana: '',
        photoURL: agent.photoURL || ''
      });
      setPhotoPreview(agent.photoURL || '');
    }
  }, [agent]);

  const handleDistrictChange = (e) => {
    const d = e.target.value;
    setForm(f => ({ ...f, district: d, thana: '' }));
    setThanas(getThanasForDistrict(d));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error('Photo must be under 300 KB');
      fileRef.current.value = '';
      setPhotoFile(null);
      setPhotoPreview(agent?.photoURL || '');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone1.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!isEdit && (!form.district || !form.thana)) {
      toast.error('Please select district and thana');
      return;
    }
    if (photoFile && photoFile.size > 300 * 1024) {
      toast.error('Photo must be under 300 KB');
      return;
    }
    setSaving(true);
    try {
      let photoURL = form.photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `agents/${Date.now()}_${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      if (isEdit) {
        await updateDoc(doc(db, 'agents', agent.id), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone1: form.phone1.trim(),
          phone2: form.phone2.trim(),
          phone3: form.phone3.trim(),
          photoURL,
          updatedAt: new Date().toISOString()
        });
        toast.success('Agent updated successfully');
      } else {
        // Create agent document first
        const agentRef = await addDoc(collection(db, 'agents'), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone1: form.phone1.trim(),
          phone2: form.phone2.trim(),
          phone3: form.phone3.trim(),
          photoURL,
          currentOfficeId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Find or create the agency office for selected district/thana
        const officeSnap = await getDocs(
          query(collection(db, 'agencyOffices'),
            where('district', '==', form.district),
            where('thana', '==', form.thana))
        );

        let officeId;
        if (!officeSnap.empty) {
          officeId = officeSnap.docs[0].id;
          // Displace any agent currently assigned to this office
          const existingAgentId = officeSnap.docs[0].data().currentAgentId;
          if (existingAgentId) {
            await updateDoc(doc(db, 'agents', existingAgentId), { currentOfficeId: null });
          }
          await updateDoc(doc(db, 'agencyOffices', officeId), { currentAgentId: agentRef.id });
        } else {
          const officeRef = await addDoc(collection(db, 'agencyOffices'), {
            district: form.district,
            thana: form.thana,
            currentAgentId: agentRef.id,
            createdAt: new Date().toISOString()
          });
          officeId = officeRef.id;
        }

        await updateDoc(doc(db, 'agents', agentRef.id), { currentOfficeId: officeId });
        toast.success('Agent added successfully');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save agent: ' + (err.message || err.code || err));
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Agent' : 'Add New Agent'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Photo */}
            <div className="form-group">
              <label className="form-label">Profile Photo</label>
              <div className="photo-upload">
                <div className="photo-preview" onClick={() => fileRef.current.click()}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" />
                    : <User size={28} color="var(--olive-pale)" />
                  }
                </div>
                <div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                    <Upload size={13} /> Upload Photo
                  </button>
                  <p className="form-hint">JPG or PNG, max 300 KB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name <span className="req">*</span></label>
                <input className="form-input" value={form.firstName} onChange={set('firstName')} placeholder="First name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name <span className="req">*</span></label>
                <input className="form-input" value={form.lastName} onChange={set('lastName')} placeholder="Last name" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Phone <span className="req">*</span></label>
              <input className="form-input" value={form.phone1} onChange={set('phone1')} placeholder="e.g. 01712345678" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone 2</label>
                <input className="form-input" value={form.phone2} onChange={set('phone2')} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone 3</label>
                <input className="form-input" value={form.phone3} onChange={set('phone3')} placeholder="Optional" />
              </div>
            </div>

            {/* District/Thana only shown on Add, not Edit */}
            {!isEdit && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">District <span className="req">*</span></label>
                  <select className="form-select" value={form.district} onChange={handleDistrictChange} required>
                    <option value="">Select district</option>
                    {bangladeshData.map(d => (
                      <option key={d.district} value={d.district}>{d.district}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Thana <span className="req">*</span></label>
                  <select className="form-select" value={form.thana} onChange={set('thana')} required disabled={!form.district}>
                    <option value="">Select thana</option>
                    {thanas.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}

            {isEdit && office && (
              <div style={{
                background: 'var(--olive-xfaint)', border: '1px solid var(--olive-pale)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                fontSize: '12.5px', color: 'var(--gray-500)'
              }}>
                Location: <strong>{office.thana}, {office.district}</strong> — use "Move Agent" to change.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner"></span> Saving...</> : (isEdit ? 'Update Agent' : 'Add Agent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
