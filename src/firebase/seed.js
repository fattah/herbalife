import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

const ACCOUNTS = [
  {
    email: 'superadmin@herbalife.internal',
    password: 'secretmanager',
    profile: {
      username: 'superadmin',
      email: 'superadmin@herbalife.internal',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin',
      createdAt: new Date().toISOString()
    }
  },
  {
    email: 'admin@herbalife.internal',
    password: 'changeit2026',
    profile: {
      username: 'admin',
      email: 'admin@herbalife.internal',
      firstName: 'Central',
      lastName: 'Admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  }
];

export const seedInitialAdmins = async () => {
  for (const account of ACCOUNTS) {
    try {
      const result = await createUserWithEmailAndPassword(auth, account.email, account.password);
      await setDoc(doc(db, 'admins', result.user.uid), account.profile);
      await signOut(auth);
      console.log(`✅ Seeded: ${account.profile.username}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // Account already exists — nothing to do
      } else {
        console.error(`Seed error for ${account.email}:`, err);
      }
      await signOut(auth).catch(() => {});
    }
  }
};