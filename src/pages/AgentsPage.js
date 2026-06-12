import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, deleteDoc, doc, query, orderBy, getDocs
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
  const [agents, setAgents] = useState([]);
  const [callHistoryMap, setCallHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [moveAgent, setMoveAgent] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterThana, setFilterThana] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'agents'), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'callHistory'), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!map[data.agentId]) map[data.agentId] = [];
        map[data.agentId].push(data);
      });
      setCallHistoryMap(map);
    });
    return unsub;
  }, []);

  const districts = getAllDistricts();
  const thanas = useMemo(() => {
    if (!filterDistrict) return [];
    return getThanasForDistrict(filterDistrict);
  }, [filterDistrict]);

  const enrichedAgents = useMemo(() => {
    return agents.map(a => ({
      ...a,
      _status: getAgentStatus(callHistoryMap[a.id] || [])
    }));
  }, [agents, callHistoryMap]);

  const filtered = useMemo(() => {
    let arr = enrichedAgents;
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(a =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(s) ||
        a.district?.toLowerCase().includes(s) ||
        a.thana?.toLowerCase().includes(s)
      );
    }
    if (filterDistrict) arr = arr.filter(a => a.district === filterDistrict);
    if (filterThana) arr = arr.filter(a => a.thana === filterThana);
    return sortAgentsByStatus(arr);
  }, [enrichedAgents, search, filterDistrict, filterThana]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (agent) => {
    try {
      await deleteDoc(doc(db, 'agents', agent.id));
      toast.success('Agent deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  const stats = useMemo(() => ({
    total: enrichedAgents.length,
    red: enrichedAgents.filter(a => a._status === 'red').length,
    yellow: enrichedAgents.filter(a => a._status === 'yellow').length,
    green: enrichedAgents.filter(a => a._status === 'green').length,
  }), [enrichedAgents]);

  const rowClass = (status) => {
    if (status === 'red') return 'highlight-red';
    if (status === 'yellow') return 'highlight-yellow';
    if (status === 'green') return 'highlight-green';
    return '';
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-olive"><Users size={20} /></div>
          <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Agents</div></div>
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

      {/* Filter bar */}
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
          <button className="btn btn-primary" onClick={() => { setEditAgent(null); setShowForm(true); }}>
            <Plus size={14} /> Add Agent
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="spinner spinner-olive" style={{ margin: '0 auto' }}></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>No agents found matching your criteria.</p>
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
                {paginated.map(agent => {
                  const sp = getStatusBadgeProps(agent._status);
                  const lastCall = (callHistoryMap[agent.id] || []).sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt))[0];
                  return (
                    <tr
                      key={agent.id}
                      className={rowClass(agent._status)}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td>
                        <span className="agent-row-status">
                          <span className={`status-dot dot-${agent._status}`}></span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-sm">
                            {agent.photoURL
                              ? <img src={agent.photoURL} alt={agent.firstName} />
                              : getInitials(agent.firstName, agent.lastName)
                            }
                          </div>
                          <span style={{ fontWeight: 500 }}>{agent.firstName} {agent.lastName}</span>
                        </div>
                      </td>
                      <td>{agent.district}</td>
                      <td>{agent.thana}</td>
                      <td><span style={{ fontSize: '12.5px' }}>{agent.phone1}</span></td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          {lastCall ? formatDateTime(lastCall.createdAt) : '—'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Edit"
                            onClick={() => { setEditAgent(agent); setShowForm(true); }}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Move to Thana"
                            onClick={() => { setMoveAgent(agent); setShowMove(true); }}>
                            <ArrowRightLeft size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete"
                            style={{ color: 'var(--red)' }}
                            onClick={() => setDeleteConfirm(agent)}>
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

        {/* Pagination */}
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
              {filtered.length} agents
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <AgentFormModal
          agent={editAgent}
          onClose={() => { setShowForm(false); setEditAgent(null); }}
        />
      )}
      {showMove && moveAgent && (
        <MoveAgentModal
          agent={moveAgent}
          onClose={() => { setShowMove(false); setMoveAgent(null); }}
        />
      )}
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Agent</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                Are you sure you want to delete <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete Agent</button>
            </div>
          </div>
        </div>
      )}

      <AgentPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  );
}
