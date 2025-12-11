
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React build folder (dist)
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

// Helper to get local IP and Subnet
function getLocalNetwork() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal/loopback and non-ipv4
            if (iface.family === 'IPv4' && !iface.internal) {
                // Return generic /24 subnet based on IP (e.g., 192.168.1.0/24)
                const parts = iface.address.split('.');
                parts.pop();
                return `${parts.join('.')}.0/24`;
            }
        }
    }
    return '192.168.0.0/24'; // Fallback
}

// API: Real Network Scan
app.get('/api/scan', (req, res) => {
    const subnet = getLocalNetwork();
    console.log(`[Scanner] Iniciando scan em: ${subnet}`);

    // Command breakdown:
    // nmap
    // -p 554,80,8080,8000: Check typical camera ports (RTSP, HTTP, ONVIF)
    // --open: Only show open ports
    // -oG -: Output in Grepable format for easy parsing
    // -T4: Aggressive timing (faster)
    const command = `nmap -p 554,80,8080,8000 --open -oG - -T4 ${subnet}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Scanner] Error: ${error.message}`);
            // If nmap is missing, return friendly error
            if (error.message.includes('not found')) {
                return res.status(500).json({ error: "Nmap não instalado. Execute: sudo apt install nmap" });
            }
            return res.status(500).json({ error: "Falha ao executar scan." });
        }

        const devices = [];
        const lines = stdout.split('\n');

        lines.forEach(line => {
            // Example line: Host: 192.168.1.55 ()	Ports: 80/open/tcp//http///, 554/open/tcp//rtsp///
            if (line.includes('Host:') && line.includes('Ports:')) {
                const ipMatch = line.match(/Host: ([0-9.]+)/);
                const ip = ipMatch ? ipMatch[1] : null;
                
                if (ip) {
                    let model = "Dispositivo Desconhecido";
                    let manufacturer = "Genérico";
                    
                    // Simple heuristic to guess device type based on ports
                    if (line.includes('554/open')) {
                        model = "Câmera IP (RTSP)";
                        manufacturer = "Compatível ONVIF";
                    } else if (line.includes('80/open') || line.includes('8080/open')) {
                        model = "Web Service / Câmera";
                    }

                    // Only add if it looks like a camera (has RTSP or Web port open)
                    devices.push({
                        ip: ip,
                        mac: "00:00:00:00:00:00", // Getting MAC requires sudo privileges usually
                        manufacturer: manufacturer,
                        model: model,
                        isAdded: false // Will be checked by frontend
                    });
                }
            }
        });

        console.log(`[Scanner] Encontrados ${devices.length} dispositivos.`);
        res.json(devices);
    });
});

// Handle React Routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Modo de produção: Certifique-se de ter rodado 'npm run build' antes.`);
});
