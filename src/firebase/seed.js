import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, addDoc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from './config';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const SAMPLE_AGENTS = [
  // GREEN: recent complete calls
  { firstName: 'Mohammad', lastName: 'Rahman', phone1: '01711234567', phone2: '01811234567', district: 'Dhaka', thana: 'Mirpur', call: { status: 'complete', days: 1, note: 'Weekly check-in done. Sales targets on track.' } },
  { firstName: 'Fatema', lastName: 'Begum', phone1: '01721234568', district: 'Chattogram', thana: 'Hathazari', call: { status: 'complete', days: 2, note: 'Good conversation. Agent is meeting monthly quota.' } },
  { firstName: 'Abdul', lastName: 'Karim', phone1: '01731234569', phone2: '01931234569', district: 'Bogura', thana: 'Shibganj', call: { status: 'complete', days: 3, note: 'Discussed new product line. Very enthusiastic.' } },
  { firstName: 'Nasrin', lastName: 'Akter', phone1: '01741234570', district: 'Habiganj', thana: 'Chunarughat', call: { status: 'complete', days: 4, note: 'All sales recorded. No issues raised.' } },
  { firstName: 'Md. Habibur', lastName: 'Hossain', phone1: '01751234571', district: 'Khulna', thana: 'Dumuria', call: { status: 'complete', days: 5, note: 'Sales above target this week. Great performance!' } },
  // YELLOW: followup needed
  { firstName: 'Rokeya', lastName: 'Khanam', phone1: '01761234572', phone2: '01861234572', district: 'Barishal', thana: 'Wazirpur', call: { status: 'followup', days: 1, note: 'Agent requested updated product catalog. Need to send.' } },
  { firstName: 'Shahadat', lastName: 'Hossain', phone1: '01771234573', district: 'Mymensingh', thana: 'Phulpur', call: { status: 'followup', days: 2, note: 'Stock shortage reported. Need to coordinate with warehouse.' } },
  { firstName: 'Sumaiya', lastName: 'Islam', phone1: '01781234574', district: 'Rangpur', thana: 'Mithapukur', call: { status: 'followup', days: 3, note: 'Commission structure query — pending HR response.' } },
  { firstName: 'Aminul', lastName: 'Islam', phone1: '01791234575', district: 'Cumilla', thana: 'Chandina', call: { status: 'followup', days: 4, note: 'Territory expansion request under manager review.' } },
  // RED: incomplete calls
  { firstName: 'Mahmuda', lastName: 'Sultana', phone1: '01711234576', phone2: '01811234576', district: 'Jamalpur', thana: 'Islampur', call: { status: 'incomplete', days: 1, note: 'Agent was busy, call cut short. Must follow up.' } },
  { firstName: 'Rafiqul', lastName: 'Islam', phone1: '01721234577', district: 'Gazipur', thana: 'Kaliakoir', call: { status: 'incomplete', days: 2, note: 'Network issue during call. Discussion incomplete.' } },
  { firstName: 'Sabina', lastName: 'Yasmin', phone1: '01731234578', district: 'Tangail', thana: 'Madhupur', call: { status: 'incomplete', days: 0, note: 'Agent had an emergency. Could not complete weekly call.' } },
  // RED: overdue (last call > 7 days)
  { firstName: 'Belal', lastName: 'Hossain', phone1: '01741234579', district: 'Narayanganj', thana: 'Araihazar', call: { status: 'complete', days: 10, note: 'Called last cycle but overdue this week.' } },
  { firstName: 'Morjina', lastName: 'Begum', phone1: '01751234580', phone2: '01951234580', district: 'Narsingdi', thana: 'Shibpur', call: { status: 'followup', days: 12, note: 'Territory issue from two weeks ago still unresolved.' } },
  { firstName: 'Nur', lastName: 'Mohammad', phone1: '01761234581', district: 'Pabna', thana: 'Ishwardi', call: { status: 'complete', days: 9, note: "Last contacted 9 days ago. Needs this week's call." } },
  // RED: no calls ever
  { firstName: 'Sadia', lastName: 'Rahman', phone1: '01771234582', district: 'Sirajganj', thana: 'Shahjadpur', call: null },
  { firstName: 'Shafiqul', lastName: 'Islam', phone1: '01781234583', district: 'Brahmanbaria', thana: 'Kasba', call: null },
  { firstName: 'Hasina', lastName: 'Akhter', phone1: '01791234584', district: 'Chandpur', thana: 'Haimchar', call: null },
  { firstName: 'Kamal', lastName: 'Uddin', phone1: '01711234585', district: 'Lakshmipur', thana: 'Ramganj', call: null },
  { firstName: 'Rehana', lastName: 'Parvin', phone1: '01721234586', phone2: '01821234586', district: 'Feni', thana: 'Daganbhuiyan', call: null },
  { firstName: 'Jahangir', lastName: 'Alam', phone1: '01731234587', district: 'Moulvibazar', thana: 'Sreemangal', call: null },
  { firstName: 'Nargis', lastName: 'Begum', phone1: '01741234588', district: 'Sunamganj', thana: 'Chhatak', call: null },
];

const seedSampleAgents = async () => {
  const snap = await getDocs(collection(db, 'agencyOffices'));
  if (!snap.empty) return;

  console.log('Seeding sample agents...');
  for (const { call, ...fields } of SAMPLE_AGENTS) {
    const agentRef = await addDoc(collection(db, 'agents'), {
      firstName: fields.firstName,
      lastName: fields.lastName,
      phone1: fields.phone1,
      phone2: fields.phone2 || '',
      phone3: '',
      photoURL: '',
      currentOfficeId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const officeRef = await addDoc(collection(db, 'agencyOffices'), {
      district: fields.district,
      thana: fields.thana,
      currentAgentId: agentRef.id,
      createdAt: new Date().toISOString()
    });

    await updateDoc(doc(db, 'agents', agentRef.id), { currentOfficeId: officeRef.id });

    if (call) {
      await addDoc(collection(db, 'callHistory'), {
        officeId: officeRef.id,
        agentId: agentRef.id,
        agentName: `${fields.firstName} ${fields.lastName}`,
        phone: fields.phone1,
        note: call.note,
        status: call.status,
        createdAt: daysAgo(call.days)
      });
    }
  }
  console.log(`✅ Seeded ${SAMPLE_AGENTS.length} agents with agency offices`);
};

// Sign in with primary auth, run the given callback, then sign out.
// Uses primary auth so Firestore security rules see a valid request.auth token.
const withAuth = async (email, password, callback) => {
  let uid;
  try {
    const r = await createUserWithEmailAndPassword(auth, email, password);
    uid = r.user.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const r = await signInWithEmailAndPassword(auth, email, password);
      uid = r.user.uid;
    } else {
      throw err;
    }
  }
  try {
    await callback(uid);
  } finally {
    await signOut(auth).catch(() => { });
  }
  return uid;
};

const ensureAdminDoc = async (uid, data) => {
  const snap = await getDoc(doc(db, 'admins', uid));
  if (!snap.exists()) {
    await setDoc(doc(db, 'admins', uid), data);
    console.log(`✅ Wrote admins doc for ${data.email}`);
  }
};

export const seedInitialAdmins = async () => {
  try {
    await withAuth('superadmin@herbalife.internal', 'secretmanager', async (uid) => {
      await ensureAdminDoc(uid, {
        username: 'superadmin',
        email: 'superadmin@herbalife.internal',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin',
        createdAt: new Date().toISOString()
      });
      await seedSampleAgents();
      console.log('✅ Superadmin ready');
    });
  } catch (err) {
    console.error('Superadmin seed error:', err);
    await signOut(auth).catch(() => { });
  }

  try {
    await withAuth('admin@herbalife.internal', 'changeit2026', async (uid) => {
      await ensureAdminDoc(uid, {
        username: 'admin',
        email: 'admin@herbalife.internal',
        firstName: 'Central',
        lastName: 'Admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('✅ Admin ready');
    });
  } catch (err) {
    console.error('Admin seed error:', err);
    await signOut(auth).catch(() => { });
  }
};
