import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { secondaryAuth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Plus, KeyRound, Trash2, X, ShieldCheck, Shield, Eye, EyeOff } from 'lucide-react';
import { getInitials, formatDateTime } from '../utils/agentUtils';
import toast from 'react-hot-toast';

const EMPTY_FORM = { firstName: '', lastName: '', username: '', password: '', role: 'admin' };

export default function AdminsPage() {
  const { userProfile, currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newPass, setNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
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
    const username = form.username.trim().toLowerCase();
    if (!username) { toast.error('Username is required'); return; }
    const email = `${username}@herbalife.internal`;
    setSaving(true);
    try {
      const result = await createUserWithEmailAndPassword(secondaryAuth, email, form.password);
      await setDoc(doc(db, 'admins', result.user.uid), {
        username,
        email,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: isSuperAdmin ? form.role : 'admin',
        createdAt: new Date().toISOString()
      });
      await signOut(secondaryAuth);
      toast.success(`Admin created. They can log in with username "${username}" and the password you set.`);
      setShowAdd(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error('Username already taken');
      else toast.error('Failed to create admin: ' + err.message);
      await signOut(secondaryAuth).catch(() => { });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'admins', resetTarget.id), {
        tempPassword: newPass,
        passwordResetAt: new Date().toISOString(),
      });
      toast.success(
        `Temporary password set for ${resetTarget.firstName}. They must log in once with their CURRENT password — the new one activates automatically.`,
        { duration: 7000 }
      );
      setResetTarget(null);
      setNewPass('');
    } catch {
      toast.error('Failed to set temporary password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'admins', deleteTarget.id));
      toast.success('Admin removed from system');
      setDeleteTarget(null);
    } catch {
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
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-sm">{getInitials(admin.firstName, admin.lastName)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {admin.firstName} {admin.lastName}
                            {admin.id === currentUser?.uid && (
                              <span className="badge badge-olive" style={{ fontSize: '10px', marginLeft: '6px' }}>You</span>
                            )}
                          </div>
                          {admin.tempPassword && (
                            <div><span className="badge badge-yellow" style={{ fontSize: '10px' }}>Password Reset Pending</span></div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                        {admin.username}
                      </code>
                    </td>
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
                            onClick={() => { setResetTarget(admin); setNewPass(''); setShowNewPass(false); }}>
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
                    <input className="form-input" value={form.firstName} onChange={set('firstName')} required placeholder="First name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="req">*</span></label>
                    <input className="form-input" value={form.lastName} onChange={set('lastName')} required placeholder="Last name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Username <span className="req">*</span></label>
                  <input className="form-input" value={form.username} onChange={set('username')} required
                    placeholder="e.g. manager1" autoComplete="off" />
                  {form.username.trim() && (
                    <p className="form-hint">
                      They will log in with username <strong>{form.username.trim().toLowerCase()}</strong>
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="req">*</span></label>
                  <input className="form-input" type="password" value={form.password} onChange={set('password')}
                    required minLength={6} placeholder="Min. 6 characters" autoComplete="new-password" />
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
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Password</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setResetTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', marginBottom: '10px' }}>
                Setting a temporary password for <strong>{resetTarget.firstName} {resetTarget.lastName}</strong>.
              </p>
              <div style={{ background: 'var(--olive-xfaint)', border: '1px solid var(--olive-pale)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--gray-600)' }}>
                The admin must log in once with their <strong>current password</strong> — the new password activates automatically on that login.
              </div>
              <div className="form-group">
                <label className="form-label">New Temporary Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showNewPass ? 'text' : 'password'} value={newPass}
                    onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters"
                    style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowNewPass(v => !v)} style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px'
                  }}>
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={saving}>
                {saving ? 'Setting...' : 'Set Temporary Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Remove Admin</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                Remove <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> as an admin?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                This removes their profile from the system. To fully revoke login access, also delete their account in the Firebase Console.
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