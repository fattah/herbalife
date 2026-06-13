import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  doc, getDoc, updateDoc,
  collection, query, where, getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (usernameOrEmail, password) => {
    const input = usernameOrEmail.trim();
    const loginEmail = input.includes('@') ? input : `${input}@herbalife.internal`;
    const result = await signInWithEmailAndPassword(auth, loginEmail, password);

    // Apply any pending admin-set temporary password
    try {
      const snap = await getDoc(doc(db, 'admins', result.user.uid));
      if (snap.exists() && snap.data().tempPassword) {
        await updatePassword(result.user, snap.data().tempPassword);
        await updateDoc(doc(db, 'admins', result.user.uid), { tempPassword: null });
      }
    } catch {
      // Non-critical — continue login normally
    }

    return result;
  };

  const logout = () => signOut(auth);

  const changePassword = async (currentPassword, newPassword) => {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  };

  const updateProfile = async (data) => {
    await updateDoc(doc(db, 'admins', currentUser.uid), data);
    setUserProfile(prev => ({ ...prev, ...data }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tryLoadProfile = async () => {
          const snap = await getDoc(doc(db, 'admins', user.uid));
          return snap;
        };
        try {
          const snap = await tryLoadProfile();
          if (snap.exists()) {
            setCurrentUser(user);
            setUserProfile({ id: snap.id, ...snap.data() });
          } else {
            // Doc missing — could be seed writing it now. Don't sign out; App.js
            // shows "Could not load your profile" until profile appears or user logs out.
            setCurrentUser(user);
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Profile load error, retrying...', err);
          // Auth token may not be ready immediately on page refresh — retry once
          await new Promise(r => setTimeout(r, 2000));
          try {
            const snap = await tryLoadProfile();
            if (snap.exists()) {
              setCurrentUser(user);
              setUserProfile({ id: snap.id, ...snap.data() });
            } else {
              setCurrentUser(user);
              setUserProfile(null);
            }
          } catch (err2) {
            console.error('Profile load retry failed:', err2);
            // User is authenticated but profile unreadable — don't sign them out
            setCurrentUser(user);
            setUserProfile(null);
          }
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    changePassword,
    updateProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
