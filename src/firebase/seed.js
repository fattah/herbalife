import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

export const seedInitialAdmins = async () => {
  try {
    // Check if already seeded
    const seededSnap = await getDoc(doc(db, 'system', 'seeded'));
    if (seededSnap.exists()) return;

    const accounts = [
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

    for (const account of accounts) {
      try {
        const result = await createUserWithEmailAndPassword(auth, account.email, account.password);
        await setDoc(doc(db, 'admins', result.user.uid), account.profile);
        // Sign out immediately after each creation so the next one works cleanly
        await signOut(auth);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          // Already exists — still sign out to be safe
          await signOut(auth).catch(() => {});
        } else {
          console.error('Seed account error:', err);
        }
      }
    }

    // Mark seeded
    await setDoc(doc(db, 'system', 'seeded'), { seededAt: new Date().toISOString() });
    console.log('✅ Seed complete');
  } catch (err) {
    console.error('Seed failed:', err);
  }
};
