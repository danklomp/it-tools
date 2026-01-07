import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import dns from 'dns';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import tls from 'tls';

const lookup = promisify(dns.lookup);
const resolveAny = promisify(dns.resolveAny);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ping Endpoint
app.get('/api/ping', (req, res) => {
    const { host } = req.query;
    if (!host) return res.status(400).json({ error: 'Host is required' });

    const sanitizedHost = host.toString().replace(/[^a-zA-Z0-9.-]/g, '');

    exec(`ping -c 4 ${sanitizedHost}`, (error, stdout, stderr) => {
        if (error) {
            return res.json({ output: stderr || stdout || 'Ping failed' });
        }
        res.json({ output: stdout });
    });
});

// NSLookup Endpoint
app.get('/api/nslookup', async (req, res) => {
    const { host } = req.query;
    if (!host) return res.status(400).json({ error: 'Host is required' });

    try {
        const results = await resolveAny(host.toString());
        res.json({ output: JSON.stringify(results, null, 2) });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// SSL Reader Endpoint
app.get('/api/ssl', (req, res) => {
    const { host } = req.query;
    if (!host) return res.status(400).json({ error: 'Host/Domain is required' });

    const domain = host.toString().replace(/https?:\/\//, '').split('/')[0].split(':')[0];

    const options = {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false
    };

    try {
        const socket = tls.connect(options, () => {
            const cert = socket.getPeerCertificate();
            socket.end();
            if (cert && Object.keys(cert).length > 0) {
                res.json({
                    output: JSON.stringify(cert, (key, value) =>
                        typeof value === 'object' && value !== null && 'data' in value ? '[buffer]' : value, 2)
                });
            } else {
                res.json({ error: 'Could not retrieve certificate information' });
            }
        });

        socket.on('error', (err) => {
            res.json({ error: err.message });
        });

        socket.setTimeout(10000, () => {
            socket.destroy();
            res.json({ error: 'Connection timed out' });
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
