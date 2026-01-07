import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Copy,
  RefreshCw,
  Check,
  Settings,
  LayoutDashboard,
  Zap,
  Github,
  Key,
  Calendar,
  User,
  ExternalLink,
  ShieldAlert,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as forge from 'node-forge';

// --- Types ---
type ToolId = 'overview' | 'passgen' | 'ssl-reader' | 'settings';

// --- Utility Functions ---

const generatePassword = (length: number, options: {
  uppercase: boolean,
  lowercase: boolean,
  numbers: boolean,
  symbols: boolean
}) => {
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  let availableChars = '';
  if (options.uppercase) availableChars += charset.uppercase;
  if (options.lowercase) availableChars += charset.lowercase;
  if (options.numbers) availableChars += charset.numbers;
  if (options.symbols) availableChars += charset.symbols;

  if (availableChars === '') return 'Select an option';

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * availableChars.length);
    password += availableChars[randomIndex];
  }
  return password;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`sidebar-item ${active ? 'active' : ''}`}
  >
    <Icon size={18} />
    <span className="sidebar-label">{label}</span>
  </div>
);

const Checkbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
  <label className="checkbox-container">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <div className="checkbox-custom">
      {checked && <Check size={14} strokeWidth={3} />}
    </div>
    <span className="text-sm font-medium text-slate-300">{label}</span>
  </label>
);

const SSLReader = () => {
  const [input, setInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [certData, setCertData] = useState<any>(null);
  const [chain, setChain] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [chainData, setChainData] = useState<{ subjectCN: string, issuerCN: string, pem: string }[]>([]);

  const reorderPEMs = useCallback((pemString: string) => {
    const pemBlocks = pemString.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
    if (!pemBlocks || pemBlocks.length < 1) return { text: pemString, items: [] };

    try {
      const parsedCerts = pemBlocks.map(pem => {
        // Strip comments for forge parser
        const cleanPem = pem.split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
        const cert = forge.pki.certificateFromPem(cleanPem);
        const subjectCN = cert.subject.getField('CN')?.value || 'Unknown';
        const issuerCN = cert.issuer.getField('CN')?.value || 'Unknown';

        return {
          pem: pem.trim(),
          cleanPem: cleanPem.trim(),
          subjectCN,
          issuerCN,
          comment: `# Subject: ${subjectCN}\n# Issuer: ${issuerCN}`,
          cert,
          subjectHash: forge.md.sha1.create().update(cert.subject.attributes.map(a => `${a.name}:${a.value}`).join('|')).digest().toHex(),
          issuerHash: forge.md.sha1.create().update(cert.issuer.attributes.map(a => `${a.name}:${a.value}`).join('|')).digest().toHex()
        };
      });

      let endEntity = parsedCerts.find(c => !parsedCerts.some(other => other.issuerHash === c.subjectHash && other !== c));
      if (!endEntity) endEntity = parsedCerts[0];

      const reordered: typeof parsedCerts = [];
      let current: any = endEntity;
      const visited = new Set();

      while (current && !visited.has(current.pem)) {
        reordered.push(current);
        visited.add(current.pem);
        const issuer = parsedCerts.find(c => c.subjectHash === current?.issuerHash && c !== current);
        current = issuer || null;
      }

      parsedCerts.forEach(c => {
        if (!visited.has(c.pem)) {
          reordered.push(c);
        }
      });

      return {
        text: reordered.map(item => item.cleanPem).join('\n\n'),
        items: reordered.map(item => ({ subjectCN: item.subjectCN, issuerCN: item.issuerCN, pem: item.cleanPem }))
      };
    } catch (e) {
      console.error('Reorder failed', e);
      return { text: pemString, items: [] };
    }
  }, []);

  const parseCert = useCallback((rawCert?: string) => {
    let certToParse = rawCert || input.split('-----END CERTIFICATE-----')[0] + '-----END CERTIFICATE-----';

    // Strip comments for forge parser
    certToParse = certToParse.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');

    if (!certToParse.trim() || certToParse.length < 50) {
      setCertData(null);
      setError(null);
      return;
    }
    try {
      const cert = forge.pki.certificateFromPem(certToParse);
      const data = {
        subject: cert.subject.attributes.reduce((acc: any, attr: any) => ({ ...acc, [attr.shortName || attr.name]: attr.value }), {}),
        issuer: cert.issuer.attributes.reduce((acc: any, attr: any) => ({ ...acc, [attr.shortName || attr.name]: attr.value }), {}),
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
        serialNumber: cert.serialNumber,
        version: cert.version,
        publicKey: {
          n: (cert.publicKey as any).n?.toString(16),
          e: (cert.publicKey as any).e?.toString(16)
        },
        pem: certToParse
      };
      setCertData(data);
      setError(null);
    } catch (err: any) {
      setError('Invalid certificate format. Please check your PEM input.');
      setCertData(null);
    }
  }, [input]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const certFiles = files.filter(f => f.name.endsWith('.crt') || f.name.endsWith('.pem') || f.name.endsWith('.cer') || f.name.endsWith('.txt'));

    if (certFiles.length === 0) {
      setError('Please drop .crt or .pem files.');
      return;
    }

    let combinedPem = '';
    let readCount = 0;

    certFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content.includes('-----BEGIN CERTIFICATE-----')) {
          combinedPem += content + '\n\n';
        }
        readCount++;
        if (readCount === certFiles.length) {
          const sorted = reorderPEMs(combinedPem.trim());
          setInput(sorted.text);
          setChainData(sorted.items);
          setChain(sorted.items.map(i => i.pem));
          parseCert(sorted.items[0]?.pem);
        }
      };
      reader.readAsText(file);
    });
  }, [reorderPEMs, parseCert]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleReorder = useCallback(() => {
    const sorted = reorderPEMs(input);
    setInput(sorted.text);
    setChainData(sorted.items);
    setChain(sorted.items.map(i => i.pem));
    parseCert(sorted.items[0]?.pem);
    setError(null);
  }, [input, reorderPEMs, parseCert]);

  const fetchRemoteCert = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    setCertData(null);
    setChain([]);
    setAuthorized(null);
    setAuthError(null);
    try {
      const response = await fetch(`/api/fetch-cert?url=${encodeURIComponent(urlInput)}`);
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const combinedChain = (data.chain || []).join('\n\n');
      const sorted = reorderPEMs(combinedChain);

      setInput(sorted.text || combinedChain);
      setAuthorized(data.authorized);
      setAuthError(data.authError);
      setChain(data.chain || []);

      if (data.chainDetails && data.chainDetails.length > 0) {
        // Map backend details to frontend format
        const items = data.chainDetails.map((d: any) => ({
          subjectCN: d.subject?.CN || 'Unknown',
          issuerCN: d.issuer?.CN || 'Unknown',
          pem: d.pem
        }));
        setChainData(items);

        const leaf = data.chainDetails[0];
        setCertData({
          subject: (leaf.subject as any) || {},
          issuer: (leaf.issuer as any) || {},
          validFrom: new Date(leaf.valid_from),
          validTo: new Date(leaf.valid_to),
          serialNumber: leaf.serialNumber,
          version: leaf.version,
          pem: leaf.pem
        });
      } else if (data.details) {
        // Fallback for single cert
        setCertData({
          subject: (data.details.subject as any) || {},
          issuer: (data.details.issuer as any) || {},
          validFrom: new Date(data.details.valid_from),
          validTo: new Date(data.details.valid_to),
          serialNumber: data.details.serialNumber,
          version: data.details.version,
          pem: data.pem
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch certificate');
      setCertData(null);
    } finally {
      setLoading(false);
    }
  };

  // Removed automatic re-parsing to allow backend data to persist
  // The parseCert is now explicitly called on button clicks or drops.

  const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string, icon: any }) => (
    <div className="flex items-center justify-between py-3 border-b border-white-5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="text-slate-500"><Icon size={14} /></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-purple-500-10 border border-purple-20 text-purple-400">
          <Globe size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SSL Parser</h2>
          <p className="text-slate-400 text-sm">Decode and inspect PEM encoded X.509 certificates or fetch from URL with chain validation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <div
            className={`card glass-panel p-6 transition-all duration-300 ${isDragging ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)] scale-[1.02]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fetch from URL</p>
              <div className="flex gap-2">
                <input
                  className="input-control text-sm"
                  placeholder="e.g., google.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRemoteCert()}
                />
                <button onClick={fetchRemoteCert} className="btn-primary" disabled={loading}>
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Fetch'}
                </button>
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white-5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="px-2 bg-[#1c1c24] text-slate-500 font-bold tracking-widest">or drag & drop PEM bundle</span>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Certificate Content</p>
            <div className="relative group">
              <textarea
                className={`input-control font-mono text-[10px] h-32 resize-none bg-slate-900/50 transition-all ${isDragging ? 'opacity-50' : ''}`}
                placeholder="Paste PEMs or drop files here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-purple-400">
                    <RefreshCw className="animate-spin" size={32} />
                    <span className="text-xs font-bold uppercase tracking-widest">Drop to Load</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => parseCert()} className="btn-primary flex-1">
                <ShieldCheck size={18} />
                Parse
              </button>
              <button
                onClick={handleReorder}
                className="p-3 rounded-xl bg-white-5 border border-white-10 hover:bg-white-10 transition-colors text-slate-300"
                title="Reorder Certificate Chain"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {chain.length > 0 && (
            <div className="card glass-panel p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Certificate Chain</p>
              <div className="space-y-3">
                {chain.map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 text-xs truncate text-slate-300">
                      {i === 0 ? 'End Entity' : i === chain.length - 1 ? 'Root CA' : 'Intermediate'}
                    </div>
                    {i < chain.length - 1 && <div className="h-4 w-px bg-slate-800 absolute mt-10 ml-[11px]" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 mb-6">
                <ShieldAlert size={18} />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}

            {authorized !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl mb-6 border flex items-center justify-between ${authorized ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
              >
                <div className="flex items-center gap-3">
                  {authorized ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest">{authorized ? 'Chain Validated' : 'Validation Failed'}</p>
                    <p className="text-xs opacity-80">{authorized ? 'The certificate chain is fully trusted.' : authError || 'Self-signed or untrusted certificate chain.'}</p>
                  </div>
                </div>
                {authorized && <div className="px-3 py-1 rounded-full bg-green-500/20 text-[10px] font-bold uppercase tracking-widest">Trusted</div>}
              </motion.div>
            )}

            {certData && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card glass-panel p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-[0.2em] mb-4">Subject</h3>
                    <div className="space-y-1">
                      <InfoRow icon={User} label="Common Name" value={certData.subject.CN || 'N/A'} />
                      <InfoRow icon={ExternalLink} label="Organization" value={certData.subject.O || 'N/A'} />
                      <InfoRow icon={ExternalLink} label="Country" value={certData.subject.C || 'N/A'} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-[0.2em] mb-4">Issuer</h3>
                    <div className="space-y-1">
                      <InfoRow icon={User} label="Common Name" value={certData.issuer.CN || 'N/A'} />
                      <InfoRow icon={ExternalLink} label="Organization" value={certData.issuer.O || 'N/A'} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white-10">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-[0.2em] mb-6">Validity & Technical</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                    <InfoRow icon={Calendar} label="Not Before" value={certData.validFrom.toDateString()} />
                    <InfoRow icon={Calendar} label="Not After" value={certData.validTo.toDateString()} />
                    <InfoRow icon={ShieldCheck} label="Version" value={`X.509 v${certData.version + 1}`} />
                    <InfoRow icon={Key} label="Serial No" value={certData.serialNumber.length > 20 ? certData.serialNumber.substring(0, 20) + '...' : certData.serialNumber} />
                  </div>
                </div>
              </motion.div>
            )}

            {chainData.length > 0 && (
              <div className="mt-8 space-y-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Individual Certificates in Chain</p>
                {chainData.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="card glass-panel p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-500'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {idx === 0 ? 'Leaf Certificate' : idx === chainData.length - 1 ? 'Root Certificate' : 'Intermediate Certificate'}
                          </p>
                          <h4 className="text-sm font-bold text-slate-200">{item.subjectCN}</h4>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-white-2 rounded-xl border border-white-5 overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</p>
                        <p className="text-xs text-slate-300 font-medium truncate" title={item.subjectCN}>{item.subjectCN}</p>
                      </div>
                      <div className="p-3 bg-white-2 rounded-xl border border-white-5 overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Issuer</p>
                        <p className="text-xs text-slate-300 font-medium truncate" title={item.issuerCN}>{item.issuerCN}</p>
                      </div>
                    </div>

                    <div className="relative group">
                      <textarea
                        readOnly
                        className="input-control font-mono text-[10px] h-24 resize-none bg-slate-900/40 border-white-5"
                        value={item.pem}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.pem);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-700 hover:text-white"
                        title="Copy this certificate"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!certData && !loading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-slate-600">
                <ShieldCheck size={48} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm">Ready to parse certificate data</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const PasswordGenerator = () => {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    setPassword(generatePassword(length, options));
  }, [length, options]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = length < 10 ? 'Weak' : length < 14 ? 'Medium' : 'Strong';
  const strengthColor = length < 10 ? '#ef4444' : length < 14 ? '#f59e0b' : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-purple-500-10 border border-purple-20 text-purple-400">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Password Security</h2>
          <p className="text-slate-400 text-sm">Generate uncrackable passwords instantly.</p>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="relative mb-8">
          <input
            readOnly
            value={password}
            className="input-control font-mono text-xl tracking-wider py-6 pr-14"
          />
          <div className="absolute right-3 top-12 -translate-y-12 flex gap-2">
            <button
              onClick={handleGenerate}
              className="p-2 text-slate-400 hover:text-purple-400 transition-colors"
              title="Regenerate"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={copyToClipboard}
              className={`p-2 transition-all ${copied ? 'text-green-400' : 'text-slate-400 hover:text-purple-400'}`}
              title="Copy to clipboard"
            >
              <AnimatePresence mode="wait">
                {copied ? <motion.div key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }}><Check size={20} /></motion.div> : <Copy size={20} />}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Length: {length}</span>
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800" style={{ color: strengthColor }}>{strength.toUpperCase()}</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <Checkbox label="Uppercase Code" checked={options.uppercase} onChange={(val) => setOptions({ ...options, uppercase: val })} />
            <Checkbox label="Lowercase Text" checked={options.lowercase} onChange={(val) => setOptions({ ...options, lowercase: val })} />
            <Checkbox label="Numerical Data" checked={options.numbers} onChange={(val) => setOptions({ ...options, numbers: val })} />
            <Checkbox label="Special Symbols" checked={options.symbols} onChange={(val) => setOptions({ ...options, symbols: val })} />
          </div>

          <button onClick={handleGenerate} className="btn-primary w-full mt-4 py-4 text-lg">
            <Zap size={20} fill="currentColor" />
            Generate Vault Key
          </button>
        </div>
      </div>

    </motion.div>
  );
};

const App = () => {
  const [activeTool, setActiveTool] = useState<ToolId>('passgen');

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap size={22} className="text-white fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ANTIGRAVITY</h1>
        </div>

        <div className="flex-1">
          <p className="category-title">Main Dashboard</p>
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTool === 'overview'} onClick={() => setActiveTool('overview')} />
          <SidebarItem icon={ShieldCheck} label="PassGen" active={activeTool === 'passgen'} onClick={() => setActiveTool('passgen')} />
          <SidebarItem icon={Key} label="SSL Reader" active={activeTool === 'ssl-reader'} onClick={() => setActiveTool('ssl-reader')} />
          <SidebarItem icon={Settings} label="Preferences" active={activeTool === 'settings'} onClick={() => setActiveTool('settings')} />
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <Github size={16} className="text-slate-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">v1.0.4 - Alpha</span>
                <span className="text-[10px] text-slate-500">Secure Environment</span>
              </div>
            </div>
            <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors">
              Documentation
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-lg font-semibold text-slate-400">Welcome back, <span className="text-slate-100">Operator</span></h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTool === 'passgen' && <PasswordGenerator key="passgen" />}
          {activeTool === 'ssl-reader' && <SSLReader key="ssl" />}
          {activeTool === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <LayoutDashboard size={48} className="mx-auto mb-6 text-slate-700" />
              <h2 className="text-2xl font-bold mb-2">Systems Overview</h2>
              <p className="text-slate-500">All modules operational. Select a tool from the sidebar.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
