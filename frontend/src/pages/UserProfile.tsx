import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Navbar from '../components/Navbar';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === id || !id;
  const profileId = id || currentUser?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      setLoading(true);
      try {
        const [{ data: profileData }, { data: activityData }] = await Promise.all([
          API.get(`/users/profile/${profileId}`),
          API.get(`/users/activity/${profileId}`)
        ]);
        setProfileUser(profileData);
        setActivities(activityData);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">sync</span>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-on-surface p-4">
        <span className="material-symbols-outlined text-error text-[64px] mb-4">error</span>
        <h2 className="text-[24px] font-bold mb-2 text-on-surface">Profile Not Found</h2>
        <p className="text-on-surface-variant mb-8 text-center max-w-md">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold uppercase tracking-wider">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest font-body-md text-on-surface min-h-screen">
      <Navbar />

      {/* SideNavBar */}
      <aside className="hidden md:flex flex-col h-full w-[260px] pt-[56px] fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant z-40">
        <div className="px-4 py-2 flex flex-col gap-1 text-left">
          <div className="flex items-center gap-3 mb-6 p-2 rounded-lg bg-surface-container-highest/50">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <div>
              <p className="font-headline-md text-body-sm font-bold text-on-surface leading-tight uppercase text-[12px]">{isOwnProfile ? currentUser?.name : profileUser.name}</p>
              <p className="font-code-sm text-code-sm text-on-surface-variant text-[10px]">@{isOwnProfile ? currentUser?.username : profileUser.username || 'user'}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all rounded text-left">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-code-sm text-code-sm font-mono text-[11px] uppercase">Dashboard</span>
            </button>
            <button onClick={() => navigate('/rooms-explorer')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all rounded text-left">
              <span className="material-symbols-outlined">explore</span>
              <span className="font-code-sm text-code-sm font-mono text-[11px] uppercase">Explorer</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto border-t border-outline-variant p-4">
          <nav className="flex flex-col gap-1">
            <button onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface transition-all text-left">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-code-sm text-code-sm font-mono text-[11px] uppercase">Settings</span>
            </button>
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-container-highest text-primary border-l-2 border-primary translate-x-1 duration-200 transition-all font-mono text-[11px] uppercase font-bold">
              <span className="material-symbols-outlined">account_circle</span>
              Account
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-[40px] md:pl-[260px] min-h-screen text-left">
        <div className="max-w-6xl mx-auto p-gutter animate-fade-in pb-20">
          {/* Hero Profile Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-gutter pt-8">
            {/* Main Identity Card */}
            <div className="lg:col-span-8 glass-panel p-8 rounded-xl border border-outline-variant/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors duration-500"></div>
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-2 border-secondary p-1 presence-glow-emerald">
                    <img 
                      alt={isOwnProfile ? currentUser?.name : profileUser.name} 
                      className="w-full h-full rounded-full object-cover bg-surface-container-high" 
                      src={(isOwnProfile ? currentUser?.avatar : profileUser.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(isOwnProfile ? currentUser?.name || 'U' : profileUser.name)}&background=1d2026&color=adc6ff&size=128`} 
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-secondary border-4 border-surface-container rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1 text-[32px] font-bold">{isOwnProfile ? currentUser?.name : profileUser.name}</h1>
                  <p className="font-code-md text-code-md text-primary mb-4 font-mono text-[14px]">@{isOwnProfile ? currentUser?.username : profileUser.username || 'user'} • {(isOwnProfile ? currentUser?.title : profileUser.title) || 'Senior Collaborator'}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xl leading-relaxed text-[15px]">
                    {(isOwnProfile ? currentUser?.bio : profileUser.bio) || 'Building the future of real-time collaborative development. Obsessed with high-performance systems and pixel-perfect DX.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {((isOwnProfile ? currentUser?.skills : profileUser.skills) || ['TypeScript', 'React', 'Node.js', 'Rust']).map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-surface-container-high rounded-full font-code-sm text-code-sm border border-outline-variant text-[12px] font-mono uppercase">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex-1 glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-center">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Contributions</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-secondary text-[28px] font-mono">{(isOwnProfile ? currentUser?.stats?.contributions : profileUser.stats?.contributions) || 0}</span>
                  <span className="material-symbols-outlined text-secondary text-sm">trending_up</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-4 overflow-hidden">
                  <div className="bg-secondary h-full w-3/4"></div>
                </div>
              </div>
              <div className="flex-1 glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-center">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Rooms Created</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-primary text-[28px] font-mono">{(isOwnProfile ? currentUser?.stats?.roomsCreated : profileUser.stats?.roomsCreated) || 0}</span>
                  <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                </div>
              </div>
              <div className="flex-1 glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-center">
                <span className="font-mono text-[11px] font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Collaborators</span>
                <div className="flex items-center mt-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-container bg-surface-container-high"></div>)}
                    <div className="w-8 h-8 rounded-full border-2 border-surface-container bg-surface-container-high flex items-center justify-center font-code-sm text-code-sm text-[10px] font-bold">
                      +{(isOwnProfile ? currentUser?.stats?.collaborators : profileUser.stats?.collaborators) || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="glass-panel border border-outline-variant/30 rounded-xl p-8 mb-24">
            <h2 className="font-headline-md text-headline-md mb-8 text-[22px] font-bold">Professional Activity</h2>
            <div className="relative pl-8 border-l border-outline-variant space-y-12">
              {activities.length > 0 ? (
                activities.map((activity, idx) => (
                  <div key={idx} className="relative text-left">
                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-surface-container-low"></div>
                    <h4 className="font-bold text-[16px]">{activity.type.replace(/_/g, ' ')}</h4>
                    <p className="font-mono text-[12px] text-primary mb-2 uppercase">{new Date(activity.createdAt).toLocaleDateString()}</p>
                    <p className="text-[14px] text-on-surface-variant">{activity.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-on-surface-variant opacity-50 font-mono text-[12px] uppercase">No recent activity found.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <footer className="fixed bottom-0 w-full z-50 h-[24px] bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center px-4">
        <div className="flex items-center gap-4">
          <div className="text-on-surface flex items-center gap-2 font-mono text-[11px]">
            <span className="material-symbols-outlined text-[14px]">account_tree</span>
            <span>main</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-secondary font-mono text-[11px] font-bold uppercase">
            <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
            <span>Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserProfile;
