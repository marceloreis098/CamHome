module.exports = {
  apps : [{
    name   : "camhome-backend",
    script : "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    // Reinicia se o uso de memória passar de 300MB (segurança para o Orange Pi)
    max_memory_restart: '300M',
    
    // Configuração de Logs
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    
    // Tenta reiniciar automaticamente em caso de crash
    autorestart: true,
    watch: false
  }]
}