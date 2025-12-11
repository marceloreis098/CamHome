# CamHome Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi rodando Ubuntu Server 22.04. O **CamHome** gerencia câmeras IP, monitora armazenamento e utiliza IA para análise de quadros.

## 📋 Pré-requisitos de Hardware

- **Placa:** Orange Pi 5 (ou Raspberry Pi 4 / Mini PC com Ubuntu)
- **Sistema Operacional:** Ubuntu Server 22.04 LTS
- **Armazenamento:** Cartão SD para o sistema + HD Externo USB (para gravações)

---

## 🔧 Guia de Instalação (Passo a Passo)

Siga estes passos na ordem exata.

### Passo 1: Limpeza Profunda (Remover Node Antigo)
Seu sistema está com o Node v12 (antigo) instalado. Precisamos removê-lo completamente antes de instalar o novo.

```bash
# 1. Remover nodejs antigo e bibliotecas associadas
sudo apt remove -y nodejs npm libnode72
sudo apt autoremove -y
sudo rm -f /usr/bin/node
sudo rm -f /usr/bin/npm

# 2. Atualizar o sistema e instalar utilitários básicos
sudo apt update
sudo apt install -y curl git ca-certificates gnupg
```

### Passo 2: Instalar Node.js 20 (O Passo Crítico)
O script abaixo configura o repositório, mas **você deve rodar o comando de instalação logo em seguida**.

```bash
# 1. Baixar e configurar o repositório NodeSource (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 2. IMPORTANTE: Instalar o Node.js (Execute este comando!)
# Se pular este passo, o npm não será instalado.
sudo apt install -y nodejs

# 3. VERIFICAÇÃO OBRIGATÓRIA:
# Rode os comandos abaixo.
node -v
# DEVE retornar: v20.x.x (Se retornar v12, algo deu errado no passo 1)

npm -v
# DEVE retornar: 10.x.x
```

### Passo 3: Baixar e Instalar o CamHome
Agora que o `npm` (v10+) e `node` (v20+) estão confirmados:

```bash
# 1. Clonar o repositório (Se já clonou, apenas entre na pasta)
git clone https://github.com/marceloreis098/CamHome.git

# 2. Entrar na pasta do projeto
cd CamHome

# 3. Instalar dependências
npm install

# 4. Compilar o projeto
npm run build
```

**Se o build funcionar, você verá: `✨ Built in X.XXs` e uma pasta `dist` será criada.**

### Passo 4: Configurar o Servidor Web (Nginx)

```bash
# 1. Instalar Nginx
sudo apt install -y nginx

# 2. Criar diretório do site e copiar arquivos
sudo mkdir -p /var/www/camhome
sudo cp -r dist/. /var/www/camhome/

# 3. Ajustar permissões (Crítico para evitar erro 403)
sudo chown -R www-data:www-data /var/www/camhome
sudo chmod -R 755 /var/www/camhome
```

### Passo 5: Ativar o Site

1. Edite o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/camhome
```

2. Cole o conteúdo abaixo:
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/camhome;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
3. Salve (`Ctrl+O`, `Enter`) e Saia (`Ctrl+X`).

4. Reinicie o Nginx:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/camhome /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## 🌐 Como Acessar

1. Descubra o IP do seu Orange Pi: `hostname -I`
2. Acesse no navegador: `http://SEU_IP` (Ex: `http://192.168.1.55`)
3. **Login Padrão**:
   - Usuário: `admin`
   - Senha: `password`

---

## 🆘 Solução de Erros

**Erro: `-bash: npm: command not found`**
- **Causa:** O comando `sudo apt install -y nodejs` não foi executado após o script do curl.
- **Solução:** Rode `sudo apt install -y nodejs` e verifique novamente.

**Erro: `sh: 1: parcel: not found` durante o build**
- **Causa:** O `npm install` não rodou ou falhou.
- **Solução:**
  ```bash
  rm -rf node_modules
  npm install
  npm run build
  ```

---
**Desenvolvido por Marcelo Reis**