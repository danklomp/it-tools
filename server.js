import express from 'express';
import cors from 'cors';
import tls from 'tls';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/fetch-cert', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let hostname = '';
    try {
        const parsedUrl = new URL(url.toString().startsWith('http') ? url.toString() : `https://${url}`);
        hostname = parsedUrl.hostname;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const options = {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false
    };

    try {
        const socket = tls.connect(options, () => {
            // Get full chain with true
            const peerCert = socket.getPeerCertificate(true);
            const authorized = socket.authorized;
            const authError = socket.authorizationError;
            socket.end();

            if (!peerCert || Object.keys(peerCert).length === 0) {
                return res.status(404).json({ error: 'Could not retrieve certificate' });
            }

            const getPem = (cert) => {
                if (!cert.raw) return null;
                return `-----BEGIN CERTIFICATE-----\n${cert.raw.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
            };

            const chain = [];
            let current = peerCert;
            while (current) {
                const pem = getPem(current);
                if (pem) chain.push(pem);
                // In Node.js tls, if we used getPeerCertificate(true), 
                // the issuerCertificate property points to the next cert in the chain
                if (current.issuerCertificate && current.issuerCertificate !== current) {
                    current = current.issuerCertificate;
                } else {
                    current = null;
                }
            }

            const formatCertData = (cert) => {
                if (!cert) return null;
                return {
                    subject: cert.subject,
                    issuer: cert.issuer,
                    valid_from: cert.valid_from,
                    valid_to: cert.valid_to,
                    serialNumber: cert.serialNumber,
                    version: cert.version,
                    fingerprint: cert.fingerprint,
                    pem: getPem(cert)
                };
            };

            const fullChainDetails = [];
            current = peerCert;
            while (current) {
                fullChainDetails.push(formatCertData(current));
                if (current.issuerCertificate && current.issuerCertificate !== current) {
                    current = current.issuerCertificate;
                } else {
                    current = null;
                }
            }

            res.json({
                pem: getPem(peerCert),
                details: formatCertData(peerCert),
                chain: chain,
                chainDetails: fullChainDetails,
                authorized: authorized,
                authError: authError
            });
        });

        socket.on('error', (err) => {
            res.status(500).json({ error: err.message });
        });

        socket.setTimeout(10000, () => {
            socket.destroy();
            res.status(504).json({ error: 'Connection timed out' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve static files from the React app dist folder
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*all', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
