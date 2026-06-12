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
    let loginEmail = usernameOrEmail.trim();

    // If no @ symbol, treat as username and resolve to email
    if (!loginEmail.includes('@')) {
      const q = query(
        collection(db, 'admins'),
        where('username', '==', loginEmail)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error('Invalid username or password');
      }
      loginEmail = snap.docs[0].data().email;
    }

    return signInWithEmailAndPassword(auth, loginEmail, password);
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
        try {
          const snap = await getDoc(doc(db, 'admins', user.uid));
          if (snap.exists()) {
            setCurrentUser(user);
            setUserProfile({ id: snap.id, ...snap.data() });
          } else {
            // User exists in Auth but not in admins collection — sign out
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Profile load error:', err);
          setCurrentUser(user);
          setUserProfile(null);
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
