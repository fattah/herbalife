import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { getAgentStatus, getMapPinColor, getInitials } from '../utils/agentUtils';
import { getThanaCoordinates } from '../data/bangladeshData';
import AgentPanel from '../components/AgentPanel';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const [agents, setAgents] = useState([]);
  const [callHistoryMap, setCallHistoryMap] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'agents'), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, 'callHistory'), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!map[data.agentId]) map[data.agentId] = [];
        map[data.agentId].push(data);
      });
      setCallHistoryMap(map);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const enrichedAgents = useMemo(() =>
    agents.map(a => ({
      ...a,
      _status: getAgentStatus(callHistoryMap[a.id] || []),
      _coords: getThanaCoordinates(a.district, a.thana)
    })), [agents, callHistoryMap]);

  const counts = useMemo(() => ({
    red: enrichedAgents.filter(a => a._status === 'red').length,
    yellow: enrichedAgents.filter(a => a._status === 'yellow').length,
    green: enrichedAgents.filter(a => a._status === 'green').length,
  }), [enrichedAgents]);

  return (
    <div>
      {/* Legend */}
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
          {enrichedAgents.map(agent => {
            const color = getMapPinColor(agent._status);
            return (
              <CircleMarker
                key={agent.id}
                center={agent._coords}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.9,
                  color: 'white',
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedAgent(agent)
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    <strong>{agent.firstName} {agent.lastName}</strong><br />
                    {agent.thana}, {agent.district}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <AgentPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  );
}
