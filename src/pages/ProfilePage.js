import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials } from '../utils/agentUtils';
import { Save, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { userProfile, updateProfile, changePassword } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    username: userProfile?.username || '',
  });
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      toast.error('Passwords do not match'); return;
    }
    if (passForm.newPass.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setSavingPass(true);
    try {
      await changePassword(passForm.current, passForm.newPass);
      toast.success('Password changed successfully');
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      if (err.code === 'auth/wrong-password') toast.error('Current password is incorrect');
      else toast.error('Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  const sp = (f) => (e) => setProfileForm(v => ({ ...v, [f]: e.target.value }));
  const sf = (f) => (e) => setPassForm(v => ({ ...v, [f]: e.target.value }));

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Profile Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--olive)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white'
            }}>
              {getInitials(userProfile?.firstName, userProfile?.lastName)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                {userProfile?.firstName} {userProfile?.lastName}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                {userProfile?.role} · {userProfile?.email}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSave}>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={profileForm.firstName} onChange={sp('firstName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={profileForm.lastName} onChange={sp('lastName')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={profileForm.username} onChange={sp('username')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={userProfile?.email || ''} disabled style={{ opacity: 0.6 }} />
              <p className="form-hint">Email cannot be changed</p>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)', padding: '14px 20px' }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              <Save size={14} />
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><KeyRound size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Change Password</span>
        </div>
        <form onSubmit={handlePasswordChange}>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Current Password <span className="req">*</span></label>
              <input className="form-input" type="password" value={passForm.current} onChange={sf('current')} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password <span className="req">*</span></label>
              <input className="form-input" type="password" value={passForm.newPass} onChange={sf('newPass')} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password <span className="req">*</span></label>
              <input className="form-input" type="password" value={passForm.confirm} onChange={sf('confirm')} required />
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)', padding: '14px 20px' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPass}>
              {savingPass ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
