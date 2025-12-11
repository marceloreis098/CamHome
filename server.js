const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

// --- HELPERS ---

const MAC_VENDORS = {
    'e0:50:8b': 'Hikvision',
    '00:40:8c': 'Axis',
    '00:0f:7c': 'Dahua/Intelbras',
    '38:af:29': 'Dahua/Intelbras',
    'bc:32:5e': 'Dahua/Intelbras',
    'a0:bd:1d': 'TP-Link',
    '00:62:6e': 'Foscam',
    '4c:e6:76': 'Buffalo',
    'b0:c5:54': 'D-Link',
    '00:1d:2d': 'Wyze',
    '00:eb:d5': 'Tuya/Generic',
    'dc:4f:22': 'Espressif (ESP32-Cam)',
    '48:8f:4c': 'Vstarcam/Eye4',
    '00:12:17': 'Cisco-Linksys',
    '00:1b:11': 'D-Link',
    '00:24:8c': 'Asus',
    'd8:50:e6': 'Asus',
    'b8:27:eb': 'Raspberry Pi',
    'dc:a6:32': 'Raspberry Pi',
    'e4:5f:01': 'Raspberry Pi',
    '00:fc:04': 'Microseven'
};

// Calculates CIDR suffix (e.g. 24 for 255.255.255.0)
function getCidrSuffix(netmask) {
    if (!netmask) return 24;
    return netmask.split('.').map(Number)
      .map(part => (part >>> 0).toString(2))
      .join('')
      .split('1').length - 1;
}

// Calculates correct network base address (e.g. 192.168.1.100 & 255.255.255.192 -> 192.168.1.64)
function calculateSubnet(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    const suffix = getCidrSuffix(netmask);
    return `${networkParts.join('.')}/${suffix}`;
}

function getLocalNetwork() {
    const interfaces = os.networkInterfaces();
    let bestCandidate = null;

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // If we have a netmask, calculate properly
                if (iface.netmask) {
                    const calculated = calculateSubnet(iface.address, iface.netmask);
                    if (iface.address.startsWith('192.168')) return calculated;
                    if (!bestCandidate) bestCandidate = calculated;
                } else if (iface.cidr) {
                     // Fallback to CIDR if provided directly by Node (rarely contains correct base for subnets)
                     bestCandidate = iface.cidr; 
                }
            }
        }
    }
    return bestCandidate || '192.168.0.0/24';
}

function getArpTable() {
    try {
        const arpContent = fs.readFileSync('/proc/net/arp', 'utf8');
        const lines = arpContent.split('\n');
        const arpMap = {};
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length > 4) {
                const ip = parts[0];
                const mac = parts[3];
                if (mac && mac !== '00:00:00:00:00:00') arpMap[ip] = mac;
            }
        }
        return arpMap;
    } catch (e) {
        return {};
    }
}

function identifyVendor(mac) {
    if (!mac) return 'Desconhecido';
    const prefix = mac.substring(0, 8).toLowerCase();
    return MAC_VENDORS[prefix] || 'Genérico';
}

async function getDirRecursive(dirPath, currentDepth = 0, maxDepth = 2) {
    if (currentDepth > maxDepth) return [];
    try {
        await fs.promises.access(dirPath, fs.constants.R_OK);
        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) return [];
    } catch (e) { return []; }

    let children = [];
    try {
        const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const dirent of dirents) {
            const fullPath = path.join(dirPath, dirent.name);
            let node = {
                id: fullPath,
                name: dirent.name,
                path: fullPath,
                type: 'file',
                size: '-'
            };

            if (dirent.isDirectory()) {
                node.type = 'folder';
                if (currentDepth === 0 || ['drive','disk','usb','mnt'].some(k => dirent.name.includes(k))) {
                    node.type = 'drive';
                }
                node.children = await getDirRecursive(fullPath, currentDepth + 1, maxDepth);
                children.push(node);
            } else {
                try {
                   const fStat = await fs.promises.stat(fullPath);
                   node.size = (fStat.size / (1024 * 1024)).toFixed(2) + ' MB';
                   children.push(node);
                } catch(e) {}
            }
        }
    } catch (e) {}
    return children;
}

// --- API ROUTES ---

// 1. IMAGE PROXY (NEW) - Fixes "Broken Image" on frontend
app.get('/api/proxy', async (req, res) => {
    const { url, username, password } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // Construct Request Options
        const options = { 
            method: 'GET',
            headers: {},
            // Set a timeout to prevent hanging connections
            signal: AbortSignal.timeout(5000) 
        };

        // Handle Basic Auth manually to ensure headers are sent
        if (username && password) {
            const auth = Buffer.from(`${username}:${password}`).toString('base64');
            options.headers['Authorization'] = `Basic ${auth}`;
        }

        // Fetch using Node 20 native fetch
        const response = await fetch(url, options);

        if (!response.ok) {
            console.error(`Proxy Fetch Failed: ${response.status} for ${url}`);
            return res.status(response.status).send(`Camera returned ${response.status}`);
        }

        // Forward Content-Type (important for images)
        const contentType = response.headers.get('content-type');
        if (contentType) res.set('Content-Type', contentType);

        // Pipe the image stream directly to the client
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);

    } catch (e) {
        console.error("Proxy Error:", e.message);
        res.status(502).send("Failed to reach camera: " + e.message);
    }
});

// 2. Storage Format
app.post('/api/storage/format', async (req, res) => {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: "Caminho não especificado." });

    const forbiddenPaths = ['/', '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/proc', '/root', '/run', '/sbin', '/sys', '/usr', '/var'];
    if (forbiddenPaths.includes(targetPath) || targetPath === os.homedir()) {
         return res.status(403).json({ error: "Ação bloqueada: Caminho protegido." });
    }

    try {
        if (fs.existsSync(targetPath)) {
             await fs.promises.rm(targetPath, { recursive: true, force: true });
             await fs.promises.mkdir(targetPath, { recursive: true });
        }
        res.json({ success: true, message: "Formatado com sucesso." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Storage Tree
app.get('/api/storage/tree', async (req, res) => {
    try {
        const tree = await getDirRecursive('/mnt', 0, 2);
        const root = {
            id: 'root',
            name: 'Montagens (mnt)',
            type: 'folder',
            path: '/mnt',
            children: tree,
            isOpen: true
        };
        res.json(root);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Network Scan
app.get('/api/scan', (req, res) => {
    let subnet = req.query.subnet;
    if (!subnet) subnet = getLocalNetwork();
    
    const arpTable = getArpTable();
    console.log(`[SCAN] Iniciando varredura na rede: ${subnet}`);

    exec(`nmap -sn ${subnet}`, { timeout: 20000 }, (error, stdout, stderr) => {
        if (error) {
            console.warn(`[SCAN] Nmap falhou ou demorou. Usando ARP. Erro: ${error.message}`);
            const devices = Object.keys(arpTable).map(ip => ({
                ip,
                mac: arpTable[ip],
                manufacturer: identifyVendor(arpTable[ip]),
                model: 'Unknown (ARP)',
                isAdded: false
            }));
            return res.json(devices);
        }

        const lines = stdout.split('\n');
        const devices = [];
        let currentIp = null;
        let currentName = null;

        lines.forEach(line => {
            if (line.startsWith('Nmap scan report for')) {
                const parts = line.split(' ');
                const ipPart = parts[parts.length - 1];
                currentIp = ipPart.replace('(', '').replace(')', '');
                currentName = parts.length > 5 ? parts[parts.length - 2] : 'Unknown';
            }
            else if (line.includes('MAC Address:') && currentIp) {
                const parts = line.split('MAC Address: ');
                const macPart = parts[1].split(' ');
                const mac = macPart[0];
                const vendorFromNmap = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
                
                devices.push({
                    ip: currentIp,
                    mac: mac,
                    manufacturer: vendorFromNmap || identifyVendor(mac),
                    model: currentName !== 'Unknown' ? currentName : 'Network Device',
                    isAdded: false
                });
                currentIp = null;
            }
        });

        Object.keys(arpTable).forEach(ip => {
            if (!devices.find(d => d.ip === ip)) {
                devices.push({
                    ip,
                    mac: arpTable[ip],
                    manufacturer: identifyVendor(arpTable[ip]),
                    model: 'Device (ARP)',
                    isAdded: false
                });
            }
        });
        
        res.json(devices);
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local Network: ${getLocalNetwork()}`);
});