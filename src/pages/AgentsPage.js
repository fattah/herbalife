import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAgentStatus, getStatusBadgeProps, getInitials, sortAgentsByStatus, formatDateTime } from '../utils/agentUtils';
import AgentPanel from '../components/AgentPanel';
import AgentFormModal from '../components/AgentFormModal';
import MoveAgentModal from '../components/MoveAgentModal';
import BulkUploadModal from '../components/BulkUploadModal';
import { Plus, Search, Upload, Pencil, Trash2, ArrowRightLeft, Users } from 'lucide-react';
import { getAllDistricts, getThanasForDistrict } from '../data/bangladeshData';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

export default function AgentsPage() {
  const [offices, setOffices] = useState([]);
  const [agentsMap, setAgentsMap] = useState({});
  const [callHistoryMap, setCallHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [editOffice, setEditOffice] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [moveAgent, setMoveAgent] = useState(null);
  const [moveOffice, setMoveOffice] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterThana, setFilterThana] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    let unsub;
    let mounted = true;
    const connect = () => {
      unsub = onSnapshot(
        collection(db, 'agencyOffices'),
        snap => {
          setOffices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        err => {
          console.error('Offices listener error:', err);
          setLoading(false);
          if (mounted) setTimeout(connect, 5000);
        }
      );
    };
    connect();
    return () => { mounted = false; unsub?.(); };
  }, []);

  useEffect(() => {
    let unsub;
    let mounted = true;
    const connect = () => {
      unsub = onSnapshot(
        collection(db, 'agents'),
        snap => {
          const map = {};
          snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
          setAgentsMap(map);
        },
        err => {
          console.error('Agents listener error:', err);
          if (mounted) setTimeout(connect, 5000);
        }
      );
    };
    connect();
    return () => { mounted = false; unsub?.(); };
  }, []);

  useEffect(() => {
    let unsub;
    let mounted = true;
    const connect = () => {
      unsub = onSnapshot(
        collection(db, 'callHistory'),
        snap => {
          const map = {};
          snap.docs.forEach(d => {
            const data = d.data();
            // Support both new officeId and legacy agentId key
            const key = data.officeId || data.agentId;
            if (!map[key]) map[key] = [];
            map[key].push(data);
          });
          setCallHistoryMap(map);
        },
        err => {
          console.error('CallHistory listener error:', err);
          if (mounted) setTimeout(connect, 5000);
        }
      );
    };
    connect();
    return () => { mounted = false; unsub?.(); };
  }, []);

  const districts = getAllDistricts();
  const thanas = useMemo(() => {
    if (!filterDistrict) return [];
    return getThanasForDistrict(filterDistrict);
  }, [filterDistrict]);

  const enriched = useMemo(() => {
    return offices.map(office => {
      const agent = office.currentAgentId ? agentsMap[office.currentAgentId] : null;
      const history = callHistoryMap[office.id] || [];
      const sorted = [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return {
        ...office,
        _agent: agent || null,
        _status: getAgentStatus(history),
        _lastCall: sorted[0] || null
      };
    });
  }, [offices, agentsMap, callHistoryMap]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(o =>
        (o._agent ? `${o._agent.firstName} ${o._agent.lastName}`.toLowerCase().includes(s) : false) ||
        o.district?.toLowerCase().includes(s) ||
        o.thana?.toLowerCase().includes(s)
      );
    }
    if (filterDistrict) arr = arr.filter(o => o.district === filterDistrict);
    if (filterThana) arr = arr.filter(o => o.thana === filterThana);
    return sortAgentsByStatus(arr);
  }, [enriched, search, filterDistrict, filterThana]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (office) => {
    try {
      if (office.currentAgentId) {
        await deleteDoc(doc(db, 'agents', office.currentAgentId));
      }
      await deleteDoc(doc(db, 'agencyOffices', office.id));
      toast.success('Removed successfully');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const stats = useMemo(() => ({
    total: enriched.length,
    red: enriched.filter(o => o._status === 'red').length,
    yellow: enriched.filter(o => o._status === 'yellow').length,
    green: enriched.filter(o => o._status === 'green').length,
  }), [enriched]);

  const rowClass = (status) => {
    if (status === 'red') return 'highlight-red';
    if (status === 'yellow') return 'highlight-yellow';
    if (status === 'green') return 'highlight-green';
    return '';
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-olive"><Users size={20} /></div>
          <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Offices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><span className="status-dot dot-red"></span></div>
          <div><div className="stat-value">{stats.red}</div><div className="stat-label">Overdue / Incomplete</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><span className="status-dot dot-yellow"></span></div>
          <div><div className="stat-value">{stats.yellow}</div><div className="stat-label">Need Follow-up</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><span className="status-dot dot-green"></span></div>
          <div><div className="stat-value">{stats.green}</div><div className="stat-label">Up to Date</div></div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="form-input search-input-wrap"
            style={{ paddingLeft: '34px' }}
            placeholder="Search by name, district, thana..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: '170px' }} value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value); setFilterThana(''); setPage(1); }}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="form-select" style={{ width: '160px' }} value={filterThana}
          onChange={e => { setFilterThana(e.target.value); setPage(1); }}
          disabled={!filterDistrict}>
          <option value="">All Thanas</option>
          {thanas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => setShowBulk(true)}>
            <Upload size={14} /> Bulk Upload
          </button>
          <button className="btn btn-primary" onClick={() => { setEditAgent(null); setEditOffice(null); setShowForm(true); }}>
            <Plus size={14} /> Add Agent
          </button>
        </div>
      </div>

      <div className="card" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="spinner spinner-olive" style={{ margin: '0 auto' }}></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>No offices found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>District</th>
                  <th>Thana</th>
                  <th>Phone</th>
                  <th>Last Call</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(office => {
                  const agent = office._agent;
                  return (
                    <tr
                      key={office.id}
                      className={rowClass(office._status)}
                      onClick={() => setSelectedOffice(office)}
                    >
                      <td>
                        <span className="agent-row-status">
                          <span className={`status-dot dot-${office._status}`}></span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-sm">
                            {agent?.photoURL
                              ? <img src={agent.photoURL} alt={agent.firstName} />
                              : agent ? getInitials(agent.firstName, agent.lastName) : '—'
                            }
                          </div>
                          <span style={{
                            fontWeight: 500,
                            color: agent ? undefined : 'var(--gray-400)',
                            fontStyle: agent ? undefined : 'italic'
                          }}>
                            {agent ? `${agent.firstName} ${agent.lastName}` : 'Vacant'}
                          </span>
                        </div>
                      </td>
                      <td>{office.district}</td>
                      <td>{office.thana}</td>
                      <td><span style={{ fontSize: '12.5px' }}>{agent?.phone1 || '—'}</span></td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          {office._lastCall ? formatDateTime(office._lastCall.createdAt) : '—'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {agent && (
                            <>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Edit Agent"
                                onClick={() => { setEditAgent(agent); setEditOffice(office); setShowForm(true); }}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Move Agent"
                                onClick={() => { setMoveAgent(agent); setMoveOffice(office); setShowMove(true); }}>
                                <ArrowRightLeft size={14} />
                              </button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete"
                            style={{ color: 'var(--red)' }}
                            onClick={() => setDeleteConfirm(office)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = page <= 3 ? i + 1 : page - 2 + i;
              if (p > totalPages) return null;
              return (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)', marginLeft: '8px' }}>
              {filtered.length} offices
            </span>
          </div>
        )}
      </div>

      {showForm && (
        <AgentFormModal
          agent={editAgent}
          office={editOffice}
          onClose={() => { setShowForm(false); setEditAgent(null); setEditOffice(null); }}
        />
      )}
      {showMove && moveAgent && moveOffice && (
        <MoveAgentModal
          agent={moveAgent}
          office={moveOffice}
          onClose={() => { setShowMove(false); setMoveAgent(null); setMoveOffice(null); }}
        />
      )}
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Remove Office</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                Remove the office at <strong>{deleteConfirm.thana}, {deleteConfirm.district}</strong>
                {deleteConfirm._agent && <> and agent <strong>{deleteConfirm._agent.firstName} {deleteConfirm._agent.lastName}</strong></>}?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                Call history for this office will be preserved.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}

      <AgentPanel
        office={selectedOffice}
        agentsMap={agentsMap}
        onClose={() => setSelectedOffice(null)}
      />
    </div>
  );
}
