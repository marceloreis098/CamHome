const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
    '48:8f:4c': 'Vstarcam/Eye4'
};

// URL Patterns based on Vendor/Port
const URL_PATTERNS = {
    'Hikvision': 'http://[IP]/ISAPI/Streaming/channels/101/picture',
    'Dahua/Intelbras': 'http://[IP]/cgi-bin/snapshot.cgi?channel=1',
    'Axis': 'http://[IP]/axis-cgi/jpg/image.cgi',
    'Foscam': 'http://[IP]/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr=[USER]&pwd=[PASS]',
    'Vstarcam/Eye4': 'http://[IP]/snapshot.cgi?user=[USER]&pwd=[PASS]',
    'ONVIF_8080': 'http://[IP]:8080/onvif/snapshot', // Generic ONVIF on port 8080
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

// --- API ---

app.get('/api/scan', (req, res) => {
    const subnet = getLocalNetwork();
    console.log(`[Scanner] Iniciando scan em: ${subnet}`);

    // Scan common camera ports including 8080 (gSOAP/ONVIF) and 81 (Vstarcam Web)
    const command = `nmap -p 554,80,81,8080,8000,37777,8899,1935 --open -oG - -T4 ${subnet}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Scanner] Error: ${error.message}`);
            if (error.message.includes('not found')) {
                return res.status(500).json({ error: "Nmap não instalado. Execute: sudo apt install nmap" });
            }
            return res.status(500).json({ error: "Falha ao executar scan." });
        }

        const arpTable = getArpTable();
        const devices = [];
        const lines = stdout.split('\n');

        lines.forEach(line => {
            if (line.includes('Host:') && line.includes('Ports:')) {
                const ipMatch = line.match(/Host: ([0-9.]+)/);
                const ip = ipMatch ? ipMatch[1] : null;
                
                if (ip) {
                    const mac = arpTable[ip] || "00:00:00:00:00:00";
                    let manufacturer = identifyVendor(mac);
                    let model = "Câmera IP";
                    let suggestedUrl = "";

                    // Heuristics based on Ports
                    const has8000 = line.includes('8000/open'); // Hikvision
                    const has37777 = line.includes('37777/open'); // Dahua
                    const has8899 = line.includes('8899/open'); // ONVIF
                    const has8080 = line.includes('8080/open'); // HTTP Alt / gSOAP
                    const has554 = line.includes('554/open'); // RTSP
                    const has81 = line.includes('81/open'); // Vstarcam Alt

                    if (has8000 && manufacturer === 'Genérico') manufacturer = 'Hikvision (Detectado por Porta)';
                    if (has37777 && manufacturer === 'Genérico') manufacturer = 'Dahua/Intelbras (Detectado por Porta)';
                    
                    // Specific Logic for your cameras
                    if (manufacturer.includes('Vstarcam')) {
                        model = "Vstarcam / Eye4 IP Cam";
                    } else if (has8080 && has554) {
                        model = "Câmera ONVIF / gSOAP (Porta 8080)";
                    } else if (has554) {
                        model = "Câmera RTSP/ONVIF";
                    } else if (line.includes('80/open') || has8080) {
                        model = "Webcam / Web Server";
                    }

                    // Set Suggested URL Pattern
                    if (URL_PATTERNS[manufacturer]) {
                         suggestedUrl = URL_PATTERNS[manufacturer].replace('[IP]', ip);
                    } 
                    // Fallbacks
                    else if (manufacturer.includes('Hikvision')) {
                        suggestedUrl = URL_PATTERNS['Hikvision'].replace('[IP]', ip);
                    } else if (manufacturer.includes('Dahua') || manufacturer.includes('Intelbras')) {
                        suggestedUrl = URL_PATTERNS['Dahua/Intelbras'].replace('[IP]', ip);
                    } else if (manufacturer.includes('Vstarcam') || has81) {
                         suggestedUrl = `http://${ip}/snapshot.cgi?user=[USER]&pwd=[PASS]`;
                    } else if (has8080) {
                         // Common for Hipcam/gSOAP devices
                         suggestedUrl = `http://${ip}:8080/onvif/snapshot`; 
                    } else {
                        // Generic Fallback
                        suggestedUrl = `http://${ip}/snapshot.jpg`;
                    }

                    devices.push({
                        ip: ip,
                        mac: mac,
                        manufacturer: manufacturer,
                        model: model,
                        isAdded: false,
                        suggestedUrl: suggestedUrl
                    });
                }
            }
        });

        console.log(`[Scanner] Encontrados ${devices.length} dispositivos.`);
        res.json(devices);
    });
});

// Handle React Routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});