const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS (Cross-Origin Resource Sharing)
// This allows the frontend (port 1234 or 80) to talk to this backend (port 3000) directly
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow any origin (for local dev)
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

// Serve static files from the React build folder (dist)
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

// --- HELPERS ---

// Common Camera MAC OUIs (Organizationally Unique Identifiers)
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
    'd8:50:e6': 'Asus'
};

// URL Patterns based on Vendor/Port
const URL_PATTERNS = {
    'Hikvision': 'http://[IP]/ISAPI/Streaming/channels/101/picture',
    'Dahua/Intelbras': 'http://[IP]/cgi-bin/snapshot.cgi?channel=1',
    'Axis': 'http://[IP]/axis-cgi/jpg/image.cgi',
    'Foscam': 'http://[IP]/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr=[USER]&pwd=[PASS]',
    'Vstarcam/Eye4': 'http://[IP]/snapshot.cgi?user=[USER]&pwd=[PASS]',
    'ONVIF_8080': 'http://[IP]:8080/onvif/snapshot', 
    'Yoosee': 'http://[IP]:5000/snapshot',
    'XiongMai': 'http://[IP]/snap.jpg', // Often needs Active-X, but sometimes works
    'Generic': 'http://[IP]:8080/shot.jpg' 
};

function getLocalNetwork() {
    const interfaces = os.networkInterfaces();
    let bestCandidate = null;

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const parts = iface.address.split('.');
                const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
                
                // Prioritize 192.168.x.x as it's the most common home subnet
                if (iface.address.startsWith('192.168')) {
                    return subnet;
                }
                
                // Keep looking but save this one just in case
                if (!bestCandidate) bestCandidate = subnet;
            }
        }
    }
    return bestCandidate || '192.168.0.0/24';
}

function getArpTable() {
    try {
        // Read linux ARP table directly
        const arpContent = fs.readFileSync('/proc/net/arp', 'utf8');
        const lines = arpContent.split('\n');
        const arpMap = {};
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length > 4) {
                // IP Address is usually index 0, MAC Address index 3 in /proc/net/arp
                const ip = parts[0];
                const mac = parts[3];
                if (mac && mac !== '00:00:00:00:00:00') {
                    arpMap[ip] = mac;
                }
            }
        }
        return arpMap;
    } catch (e) {
        console.warn("[Scanner] Failed to read ARP table:", e.message);
        return {};
    }
}

function identifyVendor(mac) {
    if (!mac) return 'Desconhecido';
    const prefix = mac.substring(0, 8).toLowerCase(); // xx:xx:xx
    return MAC_VENDORS[prefix] || 'Genérico';
}

// Helper to scan directory recursively (limited depth)
async function getDirRecursive(dirPath, currentDepth = 0, maxDepth = 2) {
    if (currentDepth > maxDepth) return [];
    
    // Check if dir exists and is accessible
    try {
        await fs.promises.access(dirPath, fs.constants.R_OK);
        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) return [];
    } catch (e) {
        return [];
    }

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
                // Heuristics for Drives/Mounts
                if (currentDepth === 0 || dirent.name.includes('drive') || dirent.name.includes('disk') || dirent.name.includes('usb')) {
                    node.type = 'drive';
                }
                
                // Recursion
                node.children = await getDirRecursive(fullPath, currentDepth + 1, maxDepth);
                children.push(node);
            } else {
                // Get file size for files
                try {
                   const fStat = await fs.promises.stat(fullPath);
                   node.size = (fStat.size / (1024 * 1024)).toFixed(2) + ' MB';
                   children.push(node);
                } catch(e) {}
            }
        }
    } catch (e) {
        console.warn(`[Storage] Failed to read dir ${dirPath}: ${e.message}`);
    }
    
    return children;
}

// --- API ---

// 1. Storage Format / Clean API
app.post('/api/storage/format', async (req, res) => {
    const { path: targetPath } = req.body;

    if (!targetPath) {
        return res.status(400).json({ error: "Caminho não especificado." });
    }

    // Safety check: Prevent formatting root or crucial system folders
    const forbiddenPaths = ['/', '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/proc', '/root', '/run', '/sbin', '/sys', '/usr', '/var'];
    if (forbiddenPaths.includes(targetPath) || targetPath === os.homedir()) {
         return res.status(403).json({ error: "Ação bloqueada: Caminho do sistema protegido." });
    }

    try {
        console.log(`[Storage] Iniciando limpeza em: ${targetPath}`);
        
        // Check if path exists
        if (fs.existsSync(targetPath)) {
             // Remove all files recursively (Simulates formatting a partition mount point)
             await fs.promises.rm(targetPath, { recursive: