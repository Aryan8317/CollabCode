import React, { useState, useEffect } from 'react';
import API from '../utils/api';

interface VersionHistoryModalProps {
  roomId: string;
  onClose: () => void;
  canEdit: boolean;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ roomId, onClose, canEdit }) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionName, setVersionName] = useState('');

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/rooms/${roomId}/versions`);
      setVersions(data);
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [roomId]);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim() || !canEdit) return;
    
    setSaving(true);
    try {
      await API.post(`/rooms/${roomId}/versions`, { name: versionName });
      setVersionName('');
      fetchVersions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to restore this version? Current unsaved changes may be lost.')) return;
    
    try {
      await API.post(`/rooms/${roomId}/versions/${versionId}/restore`);
      onClose();
      // Socket will broadcast 'version-restored' so workspace will reload
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore version');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
          <div>
            <h2 className="text-[20px] font-bold text-on-surface font-geist">Version History</h2>
            <p className="text-[12px] text-on-surface-variant font-mono mt-1">Manage workspace snapshots</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {canEdit && (
            <form onSubmit={handleSaveVersion} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter version name..."
                className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary font-mono"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                required
              />
              <button 
                type="submit" 
                disabled={saving || !versionName.trim()}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold font-mono text-[12px] uppercase disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">save</span>}
                Save
              </button>
            </form>
          )}

          <div>
            <h3 className="text-[12px] font-bold font-mono text-outline uppercase tracking-widest mb-3">Snapshots</h3>
            {loading ? (
              <div className="text-center py-8 text-on-surface-variant">Loading versions...</div>
            ) : versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v._id} className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-[14px] text-on-surface mb-1">{v.name}</p>
                      <p className="font-mono text-[10px] text-on-surface-variant">
                        {new Date(v.createdAt).toLocaleString()} • by {v.createdBy.name}
                      </p>
                    </div>
                    {canEdit && (
                      <button 
                        onClick={() => handleRestore(v._id)}
                        className="opacity-0 group-hover:opacity-100 bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary px-3 py-1.5 rounded font-bold font-mono text-[10px] uppercase transition-all"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-outline font-mono text-[12px]">No versions saved yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
