import React, { useState } from 'react';
import {
    Activity,
    Globe,
    ShieldCheck,
    Code,
    Hash,
    Key,
    FileJson,
    Type,
    Lock,
    Search,
    Menu,
    Home,
    Star,
    Coffee,
    Github,
    Twitter,
    Settings,
    Sun,
    ChevronRight,
    Terminal,
    RefreshCw,
    Copy,
    CheckCircle2,
    Cpu,
    Zap,
    LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Shared Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`sidebar-nav-item ${active ? 'active' : ''}`}
    >
        <Icon size={18} />
        <span className="font-medium">{label}</span>
    </div>
);

const ToolTile = ({ title, description, icon: Icon, onClick, active }: any) => (
    <div
        onClick={onClick}
        className={`it-tool-card ${active ? 'active' : ''}`}
    >
        <div className="flex justify-between items-start">
            <div className="tool-icon-wrapper">
                <Icon size={32} />
            </div>
            <Star size={16} className="text-[#333] hover:text-yellow-500 cursor-pointer transition-colors" />
        </div>
        <div>
            <h3 className="tool-title">{title}</h3>
            <p className="tool-description">{description}</p>
        </div>
    </div>
);

// --- Tool Implementations ---

const ToolHeader = ({ title, description }: any) => (
    <div className="mb-8">
        <h2 className="text-3xl font-black mb-2">{title}</h2>
        <p className="text-gray-400">{description}</p>
    </div>
);

const PingTool = () => {
    const [host, setHost] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        if (!host) return;
        setLoading(true);
        try {
            const resp = await fetch(`/api/ping?host=${host}`);
            const data = await resp.json();
            setResult(data.output || data.error);
        } catch (e) { setResult('Communication error'); }
        setLoading(false);
    };

    return (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-8 w-full max-w-4xl mx-auto">
            <ToolHeader title="Network Ping" description="Test reachability and latency of a remote host." />
            <div className="flex gap-4">
                <input
                    className="flex-1 bg-[#2a2a2a] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#2ecc71]"
                    placeholder="Host (e.g. google.com)"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                />
                <button
                    onClick={handleRun}
                    disabled={loading}
                    className="bg-[#2ecc71] hover:bg-[#27ae60] text-black font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Execute'}
                </button>
            </div>
            {result && (
                <div className="mt-8 bg-[#0a0a0a] rounded-lg p-6 border border-[#333]">
                    <pre className="font-mono text-sm text-[#2ecc71] whitespace-pre-wrap">{result}</pre>
                </div>
            )}
        </div>
    );
};

const Base64Tool = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');

    return (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-8 w-full max-w-4xl mx-auto">
            <ToolHeader title="Base64 Converter" description="Binary-to-text encoding for secure data transmission." />
            <textarea
                className="w-full bg-[#2a2a2a] border border-[#333] rounded-lg px-4 py-4 text-white font-mono text-sm mb-4 h-48 focus:outline-none focus:border-[#2ecc71]"
                placeholder="Input text here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex gap-4 mb-8">
                <button onClick={() => setOutput(btoa(input))} className="bg-[#2ecc71] text-black font-bold px-6 py-2 rounded-lg hover:bg-[#27ae60]">Encode</button>
                <button onClick={() => { try { setOutput(atob(input)); } catch (e) { setOutput('Error Decoding'); } }} className="border border-[#333] px-6 py-2 rounded-lg hover:bg-[#2a2a2a]">Decode</button>
            </div>
            {output && (
                <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#333]">
                    <p className="text-gray-500 text-xs mb-2 uppercase font-bold tracking-widest">Result</p>
                    <div className="font-mono text-[#2ecc71] break-all">{output}</div>
                </div>
            )}
        </div>
    );
};

function FingerprintIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.02-.3 3" />
            <path d="M14 22a7 7 0 0 0 7-7c0-4.41-3.59-8-8-8s-8 3.59-8 8v7" />
            <path d="M18 12a10 10 0 0 1-13.15 9.54" />
            <path d="M20 18a14 14 0 0 0-3.32-8" />
            <path d="M22 15a12.1 12.1 0 0 1-5.63 10.37" />
            <path d="M5.61 5.34a10.95 10.95 0 0 0-1.61 10.66" />
            <path d="M8 3.41a7.95 7.95 0 0 1 11.45 6.09" />
        </svg>
    )
}

// --- Tool Data ---
const tools = [
    { id: 'ping', category: 'Network', title: 'Network Ping', description: 'Test reachability and latency of a remote host.', icon: Activity, component: PingTool },
    { id: 'nslookup', category: 'Network', title: 'DNS Lookup', description: 'Retrieve exhaustive DNS records for any domain.', icon: Globe, component: null },
    { id: 'ssl', category: 'Security', title: 'SSL Analyzer', description: 'Inspect SSL/TLS certificate details and chain of trust.', icon: ShieldCheck, component: null },
    { id: 'base64', category: 'Converter', title: 'Base64 Tool', description: 'Encode or decode text to/from Base64 format.', icon: Code, component: Base64Tool },
    { id: 'hash', category: 'Crypto', title: 'Hash Generator', description: 'Generate MD5, SHA1, SHA256 hashes easily.', icon: Hash, component: null },
    { id: 'bcrypt', category: 'Crypto', title: 'Bcrypt', description: 'Hash and compare text strings using bcrypt.', icon: Lock, component: null },
    { id: 'uuid', category: 'Crypto', title: 'UUIDs Generator', description: 'A Universally Unique Identifier for information identification.', icon: FingerprintIcon, component: null },
    { id: 'jwt', category: 'Converter', title: 'JWT Decoder', description: 'Decode JSON Web Tokens and view payload data.', icon: FileJson, component: null },
];

// --- Main App ---

const App = () => {
    const [activeToolId, setActiveToolId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filteredTools = tools.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );

    const activeTool = tools.find(t => t.id === activeToolId);

    return (
        <div className="flex h-screen overflow-hidden font-inter bg-[#121212] text-white">
            {/* Sidebar */}
            <aside className="sidebar flex-shrink-0">
                <div className="sidebar-header">
                    <h1 className="text-2xl font-black text-white italic tracking-tighter">IT - TOOLS</h1>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">Handy tools for developers</p>
                </div>

                <div className="category-label">Navigation</div>
                <SidebarItem icon={Home} label="All tools" active={activeToolId === null} onClick={() => setActiveToolId(null)} />
                <SidebarItem icon={Star} label="Favorites" />

                <div className="category-label">Crypto</div>
                {tools.filter(t => t.category === 'Crypto').map(t => (
                    <SidebarItem
                        key={t.id}
                        icon={t.icon}
                        label={t.title}
                        active={activeToolId === t.id}
                        onClick={() => setActiveToolId(t.id)}
                    />
                ))}

                <div className="category-label">Network</div>
                {tools.filter(t => t.category === 'Network').map(t => (
                    <SidebarItem
                        key={t.id}
                        icon={t.icon}
                        label={t.title}
                        active={activeToolId === t.id}
                        onClick={() => setActiveToolId(t.id)}
                    />
                ))}

                <div className="category-label">Converter</div>
                {tools.filter(t => t.category === 'Converter').map(t => (
                    <SidebarItem
                        key={t.id}
                        icon={t.icon}
                        label={t.title}
                        active={activeToolId === t.id}
                        onClick={() => setActiveToolId(t.id)}
                    />
                ))}
            </aside>

            {/* Main Area */}
            <div className="main-layout flex-1 flex flex-col h-full bg-[#121212]">
                <header className="top-header flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Menu className="text-gray-400 cursor-pointer" />
                        <Home className="text-gray-400 cursor-pointer" onClick={() => setActiveToolId(null)} />
                        <LayoutGrid className="text-gray-400 cursor-pointer" />
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            className="search-bar pl-10 focus:outline-none focus:ring-1 focus:ring-[#2ecc71]/50"
                            placeholder="Search tools (Ctrl + K)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-[#2a2a2a] rounded text-xs text-gray-400 font-bold border border-[#333]">English</div>
                        <Github className="text-gray-400" size={20} />
                        <Twitter className="text-gray-400" size={20} />
                        <Sun className="text-gray-400" size={20} />
                        <button className="bg-[#2ecc71]/10 text-[#2ecc71] border border-[#2ecc71]/20 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                            <Coffee size={14} /> Buy me a coffee
                        </button>
                    </div>
                </header>

                <main className="content-scroll flex-1 overflow-y-auto p-8">
                    <AnimatePresence mode="wait">
                        {!activeToolId ? (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">All the tools</h2>
                                <div className="tool-grid">
                                    {filteredTools.map(t => (
                                        <ToolTile
                                            key={t.id}
                                            title={t.title}
                                            description={t.description}
                                            icon={t.icon}
                                            onClick={() => setActiveToolId(t.id)}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="tool"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="min-h-full"
                            >
                                {(() => {
                                    const ToolComponent = activeTool?.component;
                                    if (ToolComponent) {
                                        return <ToolComponent />;
                                    }
                                    return (
                                        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-20 text-center max-w-4xl mx-auto">
                                            <Cpu size={64} className="mx-auto mb-6 text-gray-700 animate-pulse" />
                                            <h2 className="text-2xl font-bold mb-2">Module "{activeTool?.title}"</h2>
                                            <p className="text-gray-500">This tool is currently being provisioned in the IT-TOOLS lab.</p>
                                            <button
                                                onClick={() => setActiveToolId(null)}
                                                className="mt-8 text-[#2ecc71] font-bold uppercase tracking-widest text-xs hover:underline"
                                            >
                                                ← Back to all tools
                                            </button>
                                        </div>
                                    );
                                })()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default App;
