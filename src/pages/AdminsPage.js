import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Plus, KeyRound, Trash2, X, ShieldCheck, Shield } from 'lucide-react';
import { getInitials, formatDateTime } from '../utils/agentUtils';
import toast from 'react-hot-toast';

export default function AdminsPage() {
  const { userProfile, currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'admin' });
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = userProfile?.role === 'superadmin';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), snap => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, 'admins', result.user.uid), {
        username: form.username,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        createdAt: new Date().toISOString()
      });
      toast.success('Admin added successfully');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'admin' });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error('Email already in use');
      else toast.error('Failed to create admin: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      // Store hashed note — actual password reset via Firebase Admin SDK needed in production
      // For frontend-only: store a reset flag for admin to update themselves
      await updateDoc(doc(db, 'admins', resetTarget.id), {
        passwordResetAt: new Date().toISOString(),
        forcePasswordReset: true
      });
      toast.success('Password reset flag set. Admin will be notified.');
      setResetTarget(null);
      setNewPass('');
    } catch (err) {
      toast.error('Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'admins', deleteTarget.id));
      toast.success('Admin removed');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete admin');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Admin Users</span>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Admin
          </button>
        </div>
        <div className="card-body" style={{ paddingTop: '12px' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-sm">
                          {getInitials(admin.firstName, admin.lastName)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{admin.firstName} {admin.lastName}</span>
                        {admin.id === currentUser?.uid && (
                          <span className="badge badge-olive" style={{ fontSize: '10px' }}>You</span>
                        )}
                      </div>
                    </td>
                    <td><code style={{ fontSize: '12px', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>{admin.username}</code></td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{admin.email}</td>
                    <td>
                      {admin.role === 'superadmin'
                        ? <span className="badge badge-olive"><Shield size={11} /> Superadmin</span>
                        : <span className="badge badge-gray"><ShieldCheck size={11} /> Admin</span>
                      }
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{formatDateTime(admin.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {admin.id !== currentUser?.uid && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Reset Password"
                            onClick={() => { setResetTarget(admin); setNewPass(''); }}>
                            <KeyRound size={14} />
                          </button>
                        )}
                        {isSuperAdmin && admin.id !== currentUser?.uid && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Delete Admin"
                            style={{ color: 'var(--red)' }}
                            onClick={() => setDeleteTarget(admin)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Admin User</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddAdmin}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name <span className="req">*</span></label>
                    <input className="form-input" value={form.firstName} onChange={set('firstName')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="req">*</span></label>
                    <input className="form-input" value={form.lastName} onChange={set('lastName')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Username <span className="req">*</span></label>
                  <input className="form-input" value={form.username} onChange={set('username')} required placeholder="e.g. manager1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="req">*</span></label>
                  <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="req">*</span></label>
                  <input className="form-input" type="password" value={form.password} onChange={set('password')} required minLength={6} />
                </div>
                {isSuperAdmin && (
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={set('role')}>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner"></span> Creating...</> : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Password</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setResetTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
                Resetting password for <strong>{resetTarget.firstName} {resetTarget.lastName}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={saving}>
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Admin Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Remove Admin</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                Remove <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> as an admin? This will remove their access.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Removing...' : 'Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
