import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { bangladeshData } from '../data/bangladeshData';
import { X, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const SAMPLE_DATA = [
  { firstName: 'Mohammad', lastName: 'Rahman', phone1: '01711234567', phone2: '01811234567', phone3: '', district: 'Dhaka', thana: 'Mirpur' },
  { firstName: 'Fatema', lastName: 'Begum', phone1: '01721234568', phone2: '', phone3: '', district: 'Chattogram', thana: 'Hathazari' },
  { firstName: 'Abdul', lastName: 'Karim', phone1: '01731234569', phone2: '01931234569', phone3: '', district: 'Rajshahi', thana: 'Puthia' },
  { firstName: 'Nasrin', lastName: 'Akter', phone1: '01741234570', phone2: '', phone3: '', district: 'Sylhet', thana: 'Beanibazar' },
  { firstName: 'Md. Habibur', lastName: 'Hossain', phone1: '01751234571', phone2: '', phone3: '', district: 'Khulna', thana: 'Dumuria' },
  { firstName: 'Rokeya', lastName: 'Khanam', phone1: '01761234572', phone2: '01861234572', phone3: '', district: 'Barishal', thana: 'Wazirpur' },
  { firstName: 'Shahadat', lastName: 'Hossain', phone1: '01771234573', phone2: '', phone3: '', district: 'Mymensingh', thana: 'Phulpur' },
  { firstName: 'Sumaiya', lastName: 'Islam', phone1: '01781234574', phone2: '', phone3: '', district: 'Rangpur', thana: 'Mithapukur' },
  { firstName: 'Aminul', lastName: 'Islam', phone1: '01791234575', phone2: '', phone3: '', district: 'Cumilla', thana: 'Chandina' },
  { firstName: 'Mahmuda', lastName: 'Sultana', phone1: '01711234576', phone2: '01811234576', phone3: '', district: 'Bogura', thana: 'Shibganj' },
  { firstName: 'Rafiqul', lastName: 'Islam', phone1: '01721234577', phone2: '', phone3: '', district: 'Faridpur', thana: 'Bhanga' },
  { firstName: 'Sabina', lastName: 'Yasmin', phone1: '01731234578', phone2: '', phone3: '', district: 'Tangail', thana: 'Madhupur' },
  { firstName: 'Belal', lastName: 'Hossain', phone1: '01741234579', phone2: '', phone3: '', district: 'Dinajpur', thana: 'Parbatipur' },
  { firstName: 'Morjina', lastName: 'Begum', phone1: '01751234580', phone2: '01951234580', phone3: '', district: 'Narayanganj', thana: 'Araihazar' },
  { firstName: 'Nur', lastName: 'Mohammad', phone1: '01761234581', phone2: '', phone3: '', district: 'Gazipur', thana: 'Kaliakoir' },
  { firstName: 'Sadia', lastName: 'Rahman', phone1: '01771234582', phone2: '', phone3: '', district: 'Narsingdi', thana: 'Shibpur' },
  { firstName: 'Shafiqul', lastName: 'Islam', phone1: '01781234583', phone2: '', phone3: '', district: 'Pabna', thana: 'Ishwardi' },
  { firstName: 'Hasina', lastName: 'Akhter', phone1: '01791234584', phone2: '', phone3: '', district: 'Sirajganj', thana: 'Shahjadpur' },
  { firstName: 'Kamal', lastName: 'Uddin', phone1: '01711234585', phone2: '', phone3: '', district: 'Jamalpur', thana: 'Islampur' },
  { firstName: 'Rehana', lastName: 'Parvin', phone1: '01721234586', phone2: '01821234586', phone3: '', district: 'Kishoreganj', thana: 'Bhairab' },
  { firstName: 'Jahangir', lastName: 'Alam', phone1: '01731234587', phone2: '', phone3: '', district: 'Netrokona', thana: 'Kendua' },
  { firstName: 'Nargis', lastName: 'Begum', phone1: '01741234588', phone2: '', phone3: '', district: 'Habiganj', thana: 'Chunarughat' },
  { firstName: 'Rezaul', lastName: 'Karim', phone1: '01751234589', phone2: '', phone3: '', district: 'Moulvibazar', thana: 'Sreemangal' },
  { firstName: 'Dilara', lastName: 'Begum', phone1: '01761234590', phone2: '', phone3: '', district: 'Sunamganj', thana: 'Chhatak' },
  { firstName: 'Anisur', lastName: 'Rahman', phone1: '01771234591', phone2: '', phone3: '', district: 'Brahmanbaria', thana: 'Kasba' },
  { firstName: 'Shirina', lastName: 'Akter', phone1: '01781234592', phone2: '01881234592', phone3: '', district: 'Chandpur', thana: 'Haimchar' },
  { firstName: 'Enamul', lastName: 'Haque', phone1: '01791234593', phone2: '', phone3: '', district: 'Lakshmipur', thana: 'Ramganj' },
  { firstName: 'Sanjida', lastName: 'Islam', phone1: '01711234594', phone2: '', phone3: '', district: 'Feni', thana: 'Daganbhuiyan' },
  { firstName: 'Mosharraf', lastName: 'Hossain', phone1: '01721234595', phone2: '', phone3: '', district: 'Noakhali', thana: 'Chatkhil' },
  { firstName: 'Halima', lastName: 'Khatun', phone1: '01731234596', phone2: '', phone3: '', district: 'Cox\'s Bazar', thana: 'Chakaria' },
  { firstName: 'Zahirul', lastName: 'Islam', phone1: '01741234597', phone2: '', phone3: '', district: 'Rangamati', thana: 'Kaptai' },
  { firstName: 'Marium', lastName: 'Akter', phone1: '01751234598', phone2: '01951234598', phone3: '', district: 'Bandarban', thana: 'Lama' },
  { firstName: 'Ataur', lastName: 'Rahman', phone1: '01761234599', phone2: '', phone3: '', district: 'Khagrachhari', thana: 'Dighinala' },
  { firstName: 'Nasima', lastName: 'Begum', phone1: '01771234600', phone2: '', phone3: '', district: 'Jhenaidah', thana: 'Kaliganj' },
  { firstName: 'Golam', lastName: 'Mostafa', phone1: '01781234601', phone2: '', phone3: '', district: 'Magura', thana: 'Shalikha' },
  { firstName: 'Firoza', lastName: 'Khatun', phone1: '01791234602', phone2: '', phone3: '', district: 'Narail', thana: 'Kalia' },
  { firstName: 'Shamsul', lastName: 'Alam', phone1: '01711234603', phone2: '', phone3: '', district: 'Satkhira', thana: 'Shyamnagar' },
  { firstName: 'Bilkis', lastName: 'Begum', phone1: '01721234604', phone2: '01821234604', phone3: '', district: 'Bagerhat', thana: 'Mongla' },
  { firstName: 'Mizanur', lastName: 'Rahman', phone1: '01731234605', phone2: '', phone3: '', district: 'Pirojpur', thana: 'Mathbaria' },
  { firstName: 'Rukshana', lastName: 'Parvin', phone1: '01741234606', phone2: '', phone3: '', district: 'Barguna', thana: 'Amtali' },
  { firstName: 'Obaidur', lastName: 'Rahman', phone1: '01751234607', phone2: '', phone3: '', district: 'Patuakhali', thana: 'Galachipa' },
  { firstName: 'Selina', lastName: 'Akhter', phone1: '01761234608', phone2: '', phone3: '', district: 'Bhola', thana: 'Lalmohan' },
  { firstName: 'Wahidur', lastName: 'Rahman', phone1: '01771234609', phone2: '', phone3: '', district: 'Jhalokati', thana: 'Kathalia' },
  { firstName: 'Rahela', lastName: 'Begum', phone1: '01781234610', phone2: '', phone3: '', district: 'Meherpur', thana: 'Gangni' },
  { firstName: 'Khandaker', lastName: 'Ali', phone1: '01791234611', phone2: '', phone3: '', district: 'Chuadanga', thana: 'Damurhuda' },
  { firstName: 'Mosammat', lastName: 'Rashida', phone1: '01711234612', phone2: '01811234612', phone3: '', district: 'Kushtia', thana: 'Bheramara' },
  { firstName: 'Jalal', lastName: 'Uddin', phone1: '01721234613', phone2: '', phone3: '', district: 'Chapai Nawabganj', thana: 'Nachole' },
  { firstName: 'Sultana', lastName: 'Razia', phone1: '01731234614', phone2: '', phone3: '', district: 'Naogaon', thana: 'Porsha' },
  { firstName: 'Azizur', lastName: 'Rahman', phone1: '01741234615', phone2: '', phone3: '', district: 'Joypurhat', thana: 'Khetlal' },
  { firstName: 'Kohinoor', lastName: 'Begum', phone1: '01751234616', phone2: '', phone3: '', district: 'Natore', thana: 'Gurudaspur' },
];

export default function BulkUploadModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState(null);
  const [uploading, setUploading] = useState(false);

  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agents');
    XLSX.writeFile(wb, 'sample_agents.xlsx');
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setPreview(data.slice(0, 5));
    };
    reader.readAsBinaryString(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      let success = 0, failed = 0, errors = [];
      for (const row of data) {
        try {
          const district = String(row.district || row['District'] || '').trim();
          const thana = String(row.thana || row['Thana'] || '').trim();

          // Create agent
          const agentRef = await addDoc(collection(db, 'agents'), {
            firstName: String(row.firstName || row['First Name'] || '').trim(),
            lastName: String(row.lastName || row['Last Name'] || '').trim(),
            phone1: String(row.phone1 || row['Phone 1'] || '').trim(),
            phone2: String(row.phone2 || row['Phone 2'] || '').trim(),
            phone3: String(row.phone3 || row['Phone 3'] || '').trim(),
            photoURL: '',
            currentOfficeId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Find or create agency office
          const officeSnap = await getDocs(
            query(collection(db, 'agencyOffices'),
              where('district', '==', district),
              where('thana', '==', thana))
          );

          let officeId;
          if (!officeSnap.empty) {
            officeId = officeSnap.docs[0].id;
            const existingAgentId = officeSnap.docs[0].data().currentAgentId;
            if (existingAgentId) {
              await updateDoc(doc(db, 'agents', existingAgentId), { currentOfficeId: null });
            }
            await updateDoc(doc(db, 'agencyOffices', officeId), { currentAgentId: agentRef.id });
          } else {
            const officeRef = await addDoc(collection(db, 'agencyOffices'), {
              district,
              thana,
              currentAgentId: agentRef.id,
              createdAt: new Date().toISOString()
            });
            officeId = officeRef.id;
          }

          await updateDoc(doc(db, 'agents', agentRef.id), { currentOfficeId: officeId });
          success++;
        } catch (err) {
          failed++;
          errors.push(err.message);
        }
      }
      setResults({ success, failed, errors });
      setUploading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Bulk Upload Agents</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {!results ? (
            <>
              <div style={{
                background: 'var(--olive-xfaint)', border: '1px solid var(--olive-pale)',
                borderRadius: 'var(--radius)', padding: '14px', marginBottom: '16px'
              }}>
                <p style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '8px', fontWeight: 600 }}>
                  Download sample file first
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--gray-500)', marginBottom: '10px' }}>
                  The XLS file must have columns: firstName, lastName, phone1, phone2, phone3, district, thana
                </p>
                <button className="btn btn-secondary btn-sm" onClick={downloadSample}>
                  <Download size={13} /> Download Sample (50 rows)
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Upload XLS / XLSX File</label>
                <input type="file" accept=".xls,.xlsx" className="form-input" onChange={handleFile} />
              </div>

              {preview.length > 0 && (
                <div>
                  <p style={{ fontSize: '12.5px', color: 'var(--gray-500)', marginBottom: '8px' }}>
                    Preview (first 5 rows):
                  </p>
                  <div className="table-wrap" style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)' }}>
                    <table style={{ fontSize: '11.5px' }}>
                      <thead>
                        <tr>
                          {Object.keys(preview[0]).map(k => <th key={k}>{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>Upload Complete</p>
              <p style={{ fontSize: '14px', color: 'var(--green)', marginTop: '8px' }}>
                ✓ {results.success} agents imported successfully
              </p>
              {results.failed > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--red)', marginTop: '6px' }}>
                  ✗ {results.failed} rows failed
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{results ? 'Close' : 'Cancel'}</button>
          {!results && (
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <><span className="spinner"></span> Uploading...</> : <><Upload size={14} /> Upload</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
