import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, CheckCircle2, Circle, Clock, Sparkles, LogOut, 
  Layers, ArrowRight, Wrench, RefreshCw, User, Lock, Mail 
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authError, setAuthError] = useState('');

  // App Data State
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState('Frontend');
  const [newTools, setNewTools] = useState('');

  // Listen to Auth State changes
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

  // Fetch Nodes from Supabase
  const fetchNodes = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNodes(data);
      if (data.length > 0) setSelectedNode(data[0]);
    }
    setLoading(false);
  };

  // Auth Functions
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert('Signup successful! Check your email to confirm or sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  // Add New Node to Supabase
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

  // Toggle Node Status
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

  // Calculations
  const completedCount = nodes.filter(n => n.status === 'completed').length;
  const progressPercent = nodes.length ? Math.round((completedCount / nodes.length) * 100) : 0;
  const nextUpNode = nodes.find(n => n.status !== 'completed');

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  // 1. UNAUTHENTICATED: LOGIN / SIGNUP SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">DevFlow Visuals</h1>
          </div>

          <h2 className="text-xl font-semibold mb-2 text-center">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Track developer progress visually and map out your features
          </p>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-xs text-blue-400 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED: MAIN VISUAL DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-lg">DevFlow Visual Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <User className="w-4 h-4" /> {session.user.email}
          </span>
          <button 
            onClick={handleLogout} 
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-6 overflow-y-auto">
          {/* Progress Overview */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Overall Progress</h3>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden mb-2">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{completedCount} of {nodes.length} Done</span>
              <span className="font-bold text-blue-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Smart Next Step Recommendation */}
          <div className="bg-blue-950/40 border border-blue-800/40 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Recommended Next Step
            </div>
            {nextUpNode ? (
              <div>
                <p className="font-medium text-sm text-slate-200">{nextUpNode.title}</p>
                <p className="text-xs text-slate-400 mt-1">Phase: {nextUpNode.phase}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">All tasks completed! Great job! 🎉</p>
            )}
          </div>

          {/* Add New Feature Node Form */}
          <form onSubmit={handleAddNode} className="space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-300">Add New Module Node</h3>
            <input 
              type="text" 
              placeholder="Task title (e.g. Supabase Auth)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
            <select 
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs"
            >
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="DevOps">DevOps</option>
            </select>
            <input 
              type="text" 
              placeholder="Tools (e.g. Vite, Tailwind)"
              value={newTools}
              onChange={(e) => setNewTools(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Add Node
            </button>
          </form>
        </div>

        {/* Center Spatial Graph Canvas */}
        <div className="flex-1 bg-slate-950 relative overflow-auto p-8 flex flex-wrap content-start gap-6">
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div 
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`w-64 bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all shadow-lg ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {node.phase}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(node); }}>
                    {node.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {node.status === 'in-progress' && <Clock className="w-5 h-5 text-amber-400" />}
                    {node.status === 'todo' && <Circle className="w-5 h-5 text-slate-600" />}
                  </button>
                </div>
                <h4 className="font-semibold text-sm text-slate-200 mb-2">{node.title}</h4>
                
                {/* Tools Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {node.recommended_tools?.map((tool, idx) => (
                    <span key={idx} className="text-[10px] bg-blue-950/60 text-blue-300 border border-blue-800/30 px-1.5 py-0.5 rounded">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Details Sidebar */}
        {selectedNode && (
          <div className="w-72 border-l border-slate-800 bg-slate-900/30 p-4">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-4">Node Details</h3>
            <h2 className="text-lg font-bold text-slate-100 mb-2">{selectedNode.title}</h2>
            
            <div className="space-y-4 text-xs mt-6">
              <div>
                <span className="text-slate-400 block mb-1">Status:</span>
                <span className={`px-2 py-1 rounded font-semibold ${
                  selectedNode.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  selectedNode.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Recommended Tools:</span>
                <div className="space-y-1">
                  {selectedNode.recommended_tools?.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
