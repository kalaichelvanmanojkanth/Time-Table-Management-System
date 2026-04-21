import React, { useEffect, useState } from 'react';
import { fetchRooms } from '../services/analyticsService';

const GLOBAL_KEY = 'analytics.weeklyAvailableHours';
const ROOM_OVERRIDES_KEY = 'analytics.roomWeeklyOverrides';

export default function AnalyticsSettings({ value = 40, onChange = () => {} }) {
  const [globalHours, setGlobalHours] = useState(() => {
    const v = localStorage.getItem(GLOBAL_KEY);
    return v ? Number(v) : value;
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enableRoomOverrides, setEnableRoomOverrides] = useState(() => {
    const map = localStorage.getItem(ROOM_OVERRIDES_KEY);
    return !!map;
  });
  const [overrides, setOverrides] = useState(() => {
    try {
      const raw = localStorage.getItem(ROOM_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  });
  const [selectedRoom, setSelectedRoom] = useState('');
  const [roomHours, setRoomHours] = useState(40);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchRooms().then(list => {
      if (!mounted) return;
      setRooms(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length) setSelectedRoom(list[0]._id || list[0].id || '');
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(GLOBAL_KEY, String(globalHours));
    onChange({ weeklyAvailableHours: Number(globalHours), roomOverrides: overrides });
  }, [globalHours, overrides, onChange]);

  function saveRoomOverride() {
    if (!selectedRoom) return;
    const next = { ...overrides, [selectedRoom]: Number(roomHours) };
    setOverrides(next);
    localStorage.setItem(ROOM_OVERRIDES_KEY, JSON.stringify(next));
    setEnableRoomOverrides(true);
  }

  function removeOverride(roomId) {
    const next = { ...overrides };
    delete next[roomId];
    setOverrides(next);
    if (Object.keys(next).length === 0) {
      localStorage.removeItem(ROOM_OVERRIDES_KEY);
      setEnableRoomOverrides(false);
    } else {
      localStorage.setItem(ROOM_OVERRIDES_KEY, JSON.stringify(next));
    }
  }

  function resetGlobal() {
    setGlobalHours(40);
    localStorage.setItem(GLOBAL_KEY, '40');
  }

  return (
    <div className="bg-white shadow rounded p-4">
      <h3 className="text-lg font-semibold mb-3">Analytics settings</h3>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Weekly available hours (global)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={globalHours}
            min={1}
            onChange={e => setGlobalHours(Number(e.target.value || 0))}
          />
          <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={resetGlobal}>Reset</button>
          <button type="button" className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => onChange({ weeklyAvailableHours: Number(globalHours), roomOverrides: overrides })}>Apply</button>
        </div>
        <p className="text-xs text-gray-500 mt-1">This value is used by analytics to compute room utilization when no per-room override exists.</p>
      </div>

      <hr className="my-3" />

      <div className="mb-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={enableRoomOverrides} onChange={e => { const on = e.target.checked; setEnableRoomOverrides(on); if (!on) { localStorage.removeItem(ROOM_OVERRIDES_KEY); setOverrides({}); } }} />
          <span className="text-sm">Enable per-room weekly hours</span>
        </label>
      </div>

      {enableRoomOverrides && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="border rounded px-2 py-1 flex-1">
              {loading && <option>Loading rooms...</option>}
              {!loading && rooms.length === 0 && <option>No rooms</option>}
              {!loading && rooms.map(r => (
                <option key={r._id || r.id} value={r._id || r.id}>{r.name || r.roomName || 'Unnamed room'}</option>
              ))}
            </select>
            <input type="number" min={1} className="border rounded px-2 py-1 w-24" value={roomHours} onChange={e => setRoomHours(Number(e.target.value || 0))} />
            <button type="button" className="px-3 py-1 bg-green-500 text-white rounded" onClick={saveRoomOverride}>Save</button>
          </div>

          <div className="space-y-2">
            {Object.keys(overrides).length === 0 && <p className="text-sm text-gray-500">No overrides set yet.</p>}
            {Object.entries(overrides).map(([roomId, hrs]) => {
              const room = rooms.find(r => (r._id || r.id) === roomId) || { name: roomId };
              return (
                <div key={roomId} className="flex items-center justify-between border rounded px-2 py-1">
                  <div className="text-sm">{room.name || room.roomName || roomId} — <span className="font-medium">{hrs}h</span></div>
                  <div>
                    <button className="px-2 py-1 text-sm bg-red-500 text-white rounded" onClick={() => removeOverride(roomId)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
