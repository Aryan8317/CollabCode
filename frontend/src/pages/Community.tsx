import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Navbar from '../components/Navbar';

const Community: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comments state
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPosts();
    fetchLeaderboard();
    fetchStats();
  }, [sort]);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/community/stats');
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await API.get('/community/leaderboard');
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard', err);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/community/posts?sort=${sort}`);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { data } = await API.post('/community/posts', { content: newPostContent });
      setPosts([data, ...posts]);
      setNewPostContent('');
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const { data } = await API.put(`/community/posts/${postId}/like`);
      setPosts(posts.map(p => p._id === postId ? { ...p, likes: data } : p));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!comments[postId]) {
      try {
        const { data } = await API.get(`/community/posts/${postId}/comments`);
        setComments(prev => ({ ...prev, [postId]: data }));
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    }
  };

  const handleCreateComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const commentText = newComments[postId] || '';
    if (!commentText.trim()) return;
    try {
      const { data } = await API.post(`/community/posts/${postId}/comments`, { content: commentText });
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      setPosts(posts.map(p => p._id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error creating comment:', err);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary/30 min-h-screen">
      <Navbar />

      <div className="flex pt-[40px] h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col h-full w-[260px] bg-surface-container-low border-r border-outline-variant pt-4">
          <div className="px-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container">hub</span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md font-bold text-on-surface text-[14px]">COMMUNITY</p>
                <p className="font-code-sm text-code-sm text-on-surface-variant text-[11px]">Global Network</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-highest text-primary border-l-2 border-primary transition-all translate-x-1 duration-200 cursor-pointer">
              <span className="material-symbols-outlined icon-fill">explore</span>
              <span className="font-code-sm text-code-sm">Explorer</span>
            </div>
            <div onClick={() => navigate('/rooms-explorer')} className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer">
              <span className="material-symbols-outlined">group</span>
              <span className="font-code-sm text-code-sm">Collaborators</span>
            </div>
          </nav>
          <div className="p-4 space-y-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 bg-primary text-on-primary font-bold rounded hover:opacity-90 active:scale-95 transition-all uppercase font-mono text-[11px]"
            >
              Back to Dashboard
            </button>
            <div className="pt-4 border-t border-outline-variant space-y-1">
              <div onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer">
                <span className="material-symbols-outlined">account_circle</span>
                <span className="font-code-sm text-code-sm text-[12px]">Account</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface-container-lowest p-6 pb-24 text-left">
          {/* Hero Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
            <div className="md:col-span-8 glass-panel rounded-xl p-8 relative overflow-hidden group border border-outline-variant/30">
              <div className="relative z-10">
                <span className="inline-block px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 font-code-sm text-code-sm rounded mb-4 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">TRENDING NOW</span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2 text-[28px] font-bold">The Collaborative Code Ecosystem.</h1>
                <p className="text-on-surface-variant max-w-md mb-6 text-[14px]">Join <span className="text-secondary font-bold">{stats?.totalUsers || '...'}</span> developers across <span className="text-primary font-bold">{stats?.totalPosts || '...'}</span> active threads refactoring the future of real-time software engineering.</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/rooms-explorer')} className="px-6 py-2 bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_15px_rgba(173,198,255,0.4)] transition-all uppercase font-mono text-[11px]">Enter Room</button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none bg-gradient-to-l from-primary/20 to-transparent"></div>
            </div>
            <div className="md:col-span-4 glass-panel rounded-xl p-6 flex flex-col justify-between border-l-4 border-l-secondary border border-outline-variant/30">
              <div>
                <h2 className="font-headline-md text-headline-md mb-2 text-[20px] font-bold uppercase tracking-tight">Active Nodes</h2>
                <p className="text-on-surface-variant font-body-sm text-body-sm mb-4 text-[12px]">Live telemetry across the CollabCode network.</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-secondary">
                  <span className="font-code-sm text-code-sm uppercase font-bold tracking-widest text-[10px]">Latency</span>
                  <span className="font-code-md text-code-md font-bold text-[14px]">{stats?.latency || '14ms'}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full w-[85%]"></div>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">public</span>
                  <span className="font-code-sm text-code-sm uppercase font-bold tracking-widest text-[10px]">{stats?.activeRegions || 24} Regions Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Discussions List */}
            <div className="lg:col-span-8 space-y-6">
              {/* Post Composer Integration */}
              <div className="glass-panel border border-outline-variant/30 rounded-xl p-6 mb-8">
                <div className="flex gap-4">
                  <img 
                    className="w-10 h-10 rounded-full border border-outline-variant" 
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&size=64`} 
                    alt="" 
                  />
                  <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
                    <textarea 
                      className="w-full bg-surface-container border border-outline-variant rounded-xl py-3 px-4 text-on-surface text-[14px] focus:outline-none focus:border-primary transition-all placeholder:text-outline/50 min-h-[80px] resize-none" 
                      placeholder="Share a development update..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button 
                        disabled={isSubmitting || !newPostContent.trim()}
                        className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold font-mono text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                      >
                        {isSubmitting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                <h3 className="font-headline-md text-headline-md text-[20px] font-bold">Community Discussions</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSort('latest')}
                    className={`px-3 py-1 font-mono text-[10px] font-bold rounded uppercase transition-all ${sort === 'latest' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    LATEST
                  </button>
                  <button 
                    onClick={() => setSort('popular')}
                    className={`px-3 py-1 font-mono text-[10px] font-bold rounded uppercase transition-all ${sort === 'popular' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    POPULAR
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                   [1, 2].map(i => (
                    <div key={i} className="glass-panel rounded-lg p-4 h-32 animate-pulse border border-outline-variant/20"></div>
                   ))
                ) : posts.map((post) => (
                  <div key={post._id} className="glass-panel rounded-lg p-4 transition-colors border border-outline-variant/30">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center gap-1 bg-surface-container rounded p-2 h-fit">
                        <button onClick={(e) => { e.stopPropagation(); handleLikePost(post._id); }} className={`material-symbols-outlined text-on-surface-variant hover:text-primary ${post.likes.includes(user?.id) ? 'icon-fill' : ''}`}>
                          expand_less
                        </button>
                        <span className="font-code-md text-code-md text-primary font-bold">{post.likes.length}</span>
                        <span className="material-symbols-outlined text-on-surface-variant hover:text-error">expand_more</span>
                      </div>
                      <div className="flex-1">
                        <h4 
                          onClick={() => navigate(`/profile/${post.author._id}`)}
                          className="font-body-md text-body-md font-bold mb-1 hover:text-primary transition-colors text-[16px] cursor-pointer inline-block"
                        >
                          {post.author.name}
                        </h4>
                        <p className="text-on-surface-variant font-body-sm text-body-sm mb-3 text-[13px] whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => toggleComments(post._id)}
                            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-mono text-[11px] uppercase"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                            <span>{post.commentCount || 0} comments</span>
                          </button>
                          <div className="flex items-center gap-1 text-on-surface-variant font-mono text-[11px] uppercase">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {expandedPost === post._id && (
                          <div className="mt-4 pt-4 border-t border-outline-variant/30 space-y-4 animate-fade-in">
                            {comments[post._id]?.map((comment, i) => (
                              <div key={i} className="flex gap-3">
                                <img src={comment.author.avatar || `https://ui-avatars.com/api/?name=${comment.author.name}&size=32`} className="w-6 h-6 rounded-full" alt="" />
                                <div className="bg-surface-container rounded-lg p-3 text-[13px] w-full">
                                  <div className="flex justify-between items-center mb-1">
                                    <span onClick={() => navigate(`/profile/${comment.author._id}`)} className="font-bold cursor-pointer hover:underline">{comment.author.name}</span>
                                    <span className="font-mono text-[10px] text-on-surface-variant">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p>{comment.content}</p>
                                </div>
                              </div>
                            ))}
                            <form onSubmit={(e) => handleCreateComment(e, post._id)} className="flex gap-2">
                              <input 
                                className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] focus:border-primary outline-none"
                                placeholder="Add a comment..."
                                value={newComments[post._id] || ''}
                                onChange={(e) => setNewComments(prev => ({ ...prev, [post._id]: e.target.value }))}
                              />
                              <button type="submit" disabled={!(newComments[post._id] || '').trim()} className="bg-primary text-on-primary px-3 rounded-lg text-[11px] font-bold uppercase font-mono disabled:opacity-50">Reply</button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel rounded-xl p-6 border border-outline-variant/30">
                <h3 className="font-headline-md text-headline-md mb-6 flex items-center gap-2 text-[16px] font-bold uppercase tracking-widest">
                  <span className="material-symbols-outlined text-secondary">workspace_premium</span>
                  Top Contributors
                </h3>
                <div className="space-y-5">
                  {leaderboard.length > 0 ? leaderboard.map((user: any, idx: number) => (
                    <div key={user._id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/profile/${user._id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-secondary relative bg-surface-container overflow-hidden">
                          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&size=40`} className="w-full h-full object-cover" alt="" />
                          {idx === 0 && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-surface-container flex items-center justify-center">
                              <span className="material-symbols-outlined text-[10px] text-on-secondary icon-fill">star</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-bold text-[14px] group-hover:underline">{user.name}</p>
                          <p className="font-code-sm text-code-sm text-secondary text-[12px] font-bold">{user.score} pts</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[12px] font-mono opacity-50 uppercase">No data yet</p>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6 bg-gradient-to-br from-secondary/5 to-transparent border-t-2 border-t-secondary/30 border border-outline-variant/30">
                <h4 className="font-code-sm text-code-sm text-secondary font-bold mb-2 uppercase text-[12px]">Community Spotlight</h4>
                <div className="relative w-full h-24 rounded mb-3 overflow-hidden bg-surface-container">
                   <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                     <span className="material-symbols-outlined text-primary text-[48px]">event</span>
                   </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mb-2 font-bold">Hackathon: Real-time Debugging</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">Join our weekend hackathon starting Friday at 18:00 UTC.</p>
              </div>
            </div>
          </div>
        </main>
      </div>

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
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
            <span>Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Community;
