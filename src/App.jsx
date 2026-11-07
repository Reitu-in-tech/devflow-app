import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, CheckCircle2, Circle, Clock, Sparkles, LogOut, 
  Layers, Wrench, RefreshCw, User, Lock, Mail, Trash2, Search, Filter, Cpu 
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  // App Data State
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState('Frontend');
  const [newTools, setNewTools] = useState('');
  
  // AI Generator State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // UI Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('All');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchNodes(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchNodes(session.user.id);
      else setNodes([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchNodes = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNodes(data);
      if (data.length > 0 && !selectedNode) setSelectedNode(data[0]);
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        } else if (data.session) {
          setSession(data.session);
        } else {
          alert('Account created! You can now log in.');
          setAuthMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      }
    } catch (err) {
      setAuthError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setSelectedNode(null);
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !session) return;

    const toolsArray = newTools.split(',').map(t => t.trim()).filter(Boolean);

    const newNode = {
      user_id: session.user.id,
      title: newTitle,
      status: 'todo',
      phase: newPhase,
      recommended_tools: toolsArray.length ? toolsArray : ['General Tools'],
      x_pos: 100 + (nodes.length * 40),
      y_pos: 100 + (nodes.length * 30)
    };

    const { data, error } = await supabase
      .from('nodes')
      .insert([newNode])
      .select();

    if (!error && data) {
      setNodes([...nodes, data[0]]);
      setSelectedNode(data[0]);
      setNewTitle('');
      setNewTools('');
    } else if (error) {
      alert('Error adding node: ' + error.message);
    }
  };

  // AI-Powered Automated Node Insertion
  const handleGenerateAiPlan = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !session) return;

    setAiGenerating(true);

    try {
      const response = await fetch("/api/generate-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt }),
      });

      if (!response.ok) throw new Error("AI Endpoint request failed");

      const generatedMilestones = await response.json();

      // Convert generated milestones to the schema array
      const mappedNodes = generatedMilestones.map((milestone, idx) => ({
        user_id: session.user.id,
        title: milestone.title,
        status: "todo",
        phase: milestone.phase,
        recommended_tools: milestone.recommended_tools || ["General Tools"],
        x_pos: 120 + (nodes.length * 20) + (idx * 50),
        y_pos: 120 + (nodes.length * 20) + (idx * 30),
      }));

      // Batch insert nodes to Supabase
      const { data, error } = await supabase
        .from("nodes")
        .insert(mappedNodes)
        .select();

      if (error) throw error;

      setNodes((prev) => [...prev, ...data]);
      if (data.length > 0) setSelectedNode(data[0]);
      setAiPrompt("");
      alert(`AI brain successfully added ${data.length} new milestones!`);
    } catch (err) {
      console.error("AI Feature Error:", err);
      alert("Failed to build milestones: " + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleStatus = async (node) => {
    const nextStatus = node.status === 'todo' ? 'in-progress' : node.status === 'in-progress' ? 'completed' : 'todo';
    
    const { error } = await supabase
      .from('nodes')
      .update({ status: nextStatus })
      .eq('id', node.id);

    if (!error) {
      const updated = nodes.map(n => n.id === node.id ? { ...n, status: nextStatus } : n);
      setNodes(updated);
      if (selectedNode?.id === node.id) {
        setSelectedNode({ ...selectedNode, status: nextStatus });
      }
    }
  };

  const handleDeleteNode = async (nodeId) => {
    const { error } = await supabase.from('nodes').delete().eq('id', nodeId);
    if (!error) {
      const remaining = nodes.filter(n => n.id !== nodeId);
      setNodes(remaining);
      if (selectedNode?.id === nodeId) {
        setSelectedNode(remaining.length ? remaining[0] : null);
      }
    }
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhaseFilter === 'All' || node.phase === selectedPhaseFilter;
    return matchesSearch && matchesPhase;
  });

  const completedCount = nodes.filter(n => n.status === 'completed').length;
  const progressPercent = nodes.length ? Math.round((completedCount / nodes.length) * 100) : 0;
  const nextUpNode = nodes.find(n => n.status !== 'completed');

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">DevFlow Visuals</h1>
          </div>

          <h2 className="text-xl font-semibold mb-2 text-center text-slate-100">
            {authMode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Track developer milestones visually and structure your features
          </p>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
              className="text-xs text-blue-400 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">DevFlow Visual Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-400" /> {session.user.email}
          </span>
          <button 
            onClick={handleLogout} 
            className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Control Panel */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-5 overflow-y-auto shrink-0">
          {/* Progress Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Progress</h3>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden mb-2 border border-slate-800">
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>{completedCount} of {nodes.length} Completed</span>
              <span className="font-bold text-blue-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Smart Next Step Banner */}
          <div className="bg-blue-950/30 border border-blue-800/40 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Next Milestone
            </div>
            {nextUpNode ? (
              <div>
                <p className="font-semibold text-sm text-slate-100">{nextUpNode.title}</p>
                <p className="text-xs text-slate-400 mt-1">Phase: <span className="text-slate-200">{nextUpNode.phase}</span></p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">All milestones completed! 🎉</p>
            )}
          </div>

          {/* AI Project Planner Input Drawer */}
          <div className="bg-purple-950/20 border border-purple-800/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" /> AI Goal Planner
            </div>
            <p className="text-[11px] text-slate-400">Describe what you want to build and let AI automatically structure the milestone workflow.</p>
            <form onSubmit={handleGenerateAiPlan} className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A peer-to-peer visual car marketplace with React, Node.js, and Stripe..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-slate-600 resize-none leading-relaxed"
              />
              <button 
                type="submit" 
                disabled={aiGenerating || !aiPrompt.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/10 cursor-pointer"
              >
                {aiGenerating ? (
                  <>
                    <RefreshCw className="animate-spin w-3.5 h-3.5" /> Drafting Roadmap...
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" /> Create Visual Roadmap
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Add Module Form */}
          <form onSubmit={handleAddNode} className="space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Module Node</h3>
            <div>
              <input 
                type="text" 
                placeholder="Title (e.g. Supabase Auth)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <select 
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Database">Database</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Tools (e.g. Vite, Tailwind)"
                value={newTools}
                onChange={(e) => setNewTools(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-blue-600/20">
              <Plus className="w-4 h-4" /> Add Node
            </button>
          </form>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between gap-4 bg-slate-900/20">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              {['All', 'Frontend', 'Backend', 'Database', 'DevOps'].map((phase) => (
                <button
                  key={phase}
                  onClick={() => setSelectedPhaseFilter(phase)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedPhaseFilter === phase 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Display */}
          <div className="flex-1 p-6 overflow-auto flex flex-wrap content-start gap-4">
            {filteredNodes.length === 0 ? (
              <div className="w-full text-center py-20 text-slate-500 text-sm">
                No feature nodes found. Use the visual addition forms or describe your idea to the AI goal planner to trigger roadmap generation!
              </div>
            ) : (
              filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`w-72 bg-slate-900/80 border rounded-xl p-4 cursor-pointer transition-all shadow-md relative group ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700/50 uppercase">
                        {node.phase}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(node); }}
                          title="Toggle Status"
                          className="hover:scale-110 transition-transform"
                        >
                          {node.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                          {node.status === 'in-progress' && <Clock className="w-5 h-5 text-amber-400" />}
                          {node.status === 'todo' && <Circle className="w-5 h-5 text-slate-600" />}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          title="Delete Node"
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm text-slate-100 mb-3">{node.title}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {node.recommended_tools?.map((tool, idx) => (
                        <span key={idx} className="text-[10px] bg-blue-950/50 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-md font-mono">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details Sidebar */}
        {selectedNode && (
          <div className="w-72 border-l border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-5">
            <div>
              <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Node Inspection</h3>
              <h2 className="text-base font-bold text-slate-100">{selectedNode.title}</h2>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1.5">Status:</span>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block uppercase tracking-wider ${
                  selectedNode.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  selectedNode.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                  'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {selectedNode.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1.5">Category Phase:</span>
                <span className="text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-xs inline-block">
                  {selectedNode.phase}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1.5">Tooling Stack:</span>
                <div className="space-y-1.5">
                  {selectedNode.recommended_tools?.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px]">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-800">
              <button 
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Module Node
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}