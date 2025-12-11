# OrangeGuard Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi (Ubuntu Server 22.04).

## 📋 Pré-requisitos

- **Hardware:** Orange Pi 5 (ou similar)
- **OS:** Ubuntu Server 22.04 LTS
- **Armazenamento:** HD Externo 1TB (recomendado) conectado via USB
- **Câmeras:** 
  - Yoosee (IP: 192.168.1.2)
  - Microseven (IP: 192.168.1.25)

## 🚀 Instalação Automática (Recomendado)

Siga estes passos para colocar o servidor no ar em poucos minutos usando o script incluso.

### 1. Transferir Arquivos
Transfira a pasta do projeto para o seu Orange Pi (usando Git, SCP ou Pen Drive).

### 2. Preparar o Script
Abra o terminal na pasta do projeto e dê permissão de execução ao instalador:

```bash
chmod +x install.sh
```

### 3. Executar Instalação
Execute o script com privilégios de superusuário (root). O script irá instalar o Node.js, Nginx, configurar o Firewall e compilar a aplicação.

```bash
sudo ./install.sh
```

*Aguarde a mensagem "Instalação Concluída com Sucesso!".*

---

## 🔧 Instalação Manual (Passo a Passo)

Caso prefira configurar o ambiente manualmente sem usar o script, siga as etapas abaixo:

### 1. Atualizar o Sistema e Instalar Dependências
Atualize o Ubuntu e instale o curl:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl build-essential
```

### 2. Instalar Node.js 20 (LTS)
Adicione o repositório oficial do Node e instale:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Instalar e Configurar Nginx
Instale o servidor web:
```bash
sudo apt install -y nginx
```

Crie o arquivo de configuração do site:
```bash
sudo nano /etc/nginx/sites-available/orangeguard
```
Cole o conteúdo abaixo e salve (Ctrl+O, Enter, Ctrl+X):
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/orangeguard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Ative o site e remova o padrão:
```bash
sudo ln -s /etc/nginx/sites-available/orangeguard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 4. Compilar a Aplicação
Dentro da pasta do projeto, instale as dependências e faça o build:
```bash
npm install
npm run build
```

Mova os arquivos gerados para a pasta do servidor web:
```bash
sudo mkdir -p /var/www/orangeguard
sudo cp -r dist/* /var/www/orangeguard/
sudo chown -R www-data:www-data /var/www/orangeguard
sudo chmod -R 755 /var/www/orangeguard
```

Reinicie o Nginx:
```bash
sudo systemctl restart nginx
```

### 5. Configurar Diretórios e Firewall
Crie o ponto de montagem para o HD e configure as portas:
```bash
sudo mkdir -p /mnt/orange_drive_1tb
sudo chmod 777 /mnt/orange_drive_1tb

sudo ufw allow 22
sudo ufw allow 80
sudo ufw enable
```

---

## ⚙️ Configuração Pós-Instalação

### Acessar o Painel
Abra o navegador em qualquer computador na mesma rede e digite o IP do Orange Pi.

**Login Padrão:**
- **Usuário:** `admin`
- **Senha:** `password`

### Configurar Câmeras
1. No menu lateral, clique no ícone de engrenagem (Configurações).
2. Vá na seção **Dispositivos**.
3. Verifique se os IPs estão corretos:
   - Câmera 1: `192.168.1.2`
   - Câmera 2: `192.168.1.25`

### Montagem do HD
Para garantir que seu HD USB monte automaticamente na pasta `/mnt/orange_drive_1tb` após reiniciar:

1. Descubra o UUID do disco: `sudo blkid`
2. Edite o fstab: `sudo nano /etc/fstab`
3. Adicione a linha ao final do arquivo: 
   ```text
   UUID=SEU_UUID_AQUI /mnt/orange_drive_1tb ext4 defaults 0 0
   ```

---

## 🛠️ Comandos Úteis

- **Ver logs do Nginx:** `sudo tail -f /var/log/nginx/error.log`
- **Reiniciar servidor web:** `sudo systemctl restart nginx`
- **Atualizar a aplicação:**
  1. Faça as alterações no código localmente.
  2. Rode `npm run build`.
  3. Copie a pasta `dist` para `/var/www/orangeguard` no Orange Pi.
