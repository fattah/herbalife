import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { getAgentStatus, getMapPinColor, getInitials } from '../utils/agentUtils';
import { getThanaCoordinates } from '../data/bangladeshData';
import AgentPanel from '../components/AgentPanel';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const [offices, setOffices] = useState([]);
  const [agentsMap, setAgentsMap] = useState({});
  const [callHistoryMap, setCallHistoryMap] = useState({});
  const [selectedOffice, setSelectedOffice] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'agencyOffices'), snap => {
      setOffices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u2 = onSnapshot(collection(db, 'agents'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setAgentsMap(map);
    });
    const u3 = onSnapshot(collection(db, 'callHistory'), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const key = data.officeId || data.agentId;
        if (!map[key]) map[key] = [];
        map[key].push(data);
      });
      setCallHistoryMap(map);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const enrichedOffices = useMemo(() =>
    offices.map(o => ({
      ...o,
      _agent: o.currentAgentId ? agentsMap[o.currentAgentId] : null,
      _status: getAgentStatus(callHistoryMap[o.id] || []),
      _coords: getThanaCoordinates(o.district, o.thana)
    })), [offices, agentsMap, callHistoryMap]);

  const counts = useMemo(() => ({
    red: enrichedOffices.filter(o => o._status === 'red').length,
    yellow: enrichedOffices.filter(o => o._status === 'yellow').length,
    green: enrichedOffices.filter(o => o._status === 'green').length,
  }), [enrichedOffices]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { color: '#DC2626', label: 'Overdue / Incomplete', count: counts.red },
          { color: '#D97706', label: 'Need Follow-up', count: counts.yellow },
          { color: '#16A34A', label: 'Up to Date', count: counts.green },
        ].map(item => (
          <div key={item.color} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)', padding: '6px 12px'
          }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: item.color, boxShadow: `0 0 0 3px ${item.color}33`
            }} />
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--gray-700)' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              background: 'var(--gray-100)', color: 'var(--gray-700)',
              padding: '1px 6px', borderRadius: '10px'
            }}>{item.count}</span>
          </div>
        ))}
      </div>

      <div className="map-container">
        <MapContainer
          center={[23.8103, 90.4125]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {enrichedOffices.map(office => {
            const color = getMapPinColor(office._status);
            const agent = office._agent;
            return (
              <CircleMarker
                key={office.id}
                center={office._coords}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.9,
                  color: 'white',
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedOffice(office)
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    {agent
                      ? <><strong>{agent.firstName} {agent.lastName}</strong><br /></>
                      : <><em style={{ color: '#9CA3AF' }}>Vacant</em><br /></>
                    }
                    {office.thana}, {office.district}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <AgentPanel
        office={selectedOffice}
        agentsMap={agentsMap}
        onClose={() => setSelectedOffice(null)}
      />
    </div>
  );
}
