# CamHome Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi rodando Ubuntu Server 22.04. O **CamHome** gerencia câmeras IP, monitora armazenamento e utiliza IA para análise de quadros.

## 📋 Pré-requisitos de Hardware

- **Placa:** Orange Pi 5 (ou Raspberry Pi 4 / Mini PC com Ubuntu)
- **Sistema Operacional:** Ubuntu Server 22.04 LTS
- **Armazenamento:** Cartão SD para o sistema + HD Externo USB (para gravações)

---

## 🔧 Instalação Manual

Siga estes passos exatamente para evitar erros de compilação.

### 1. Instalar Dependências do Sistema

Primeiro, atualize o sistema e instale o **Node.js** e **npm**. É crucial que estes comandos rodem sem erros.

```bash
# 1. Atualizar lista de pacotes e instalar utilitários básicos
sudo apt update
sudo apt install -y curl git nginx

# 2. Instalar Node.js e npm (Versão estável)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. VERIFICAÇÃO (Obrigatório):
# Se estes comandos não retornarem números de versão, a instalação falhou.
node -v
npm -v
```

### 2. Baixar e Instalar o Projeto

Aqui corrigimos o erro `parcel: not found`. Você **DEVE** rodar o `npm install` antes do build.

```bash
# 1. Clonar o repositório
git clone https://github.com/marceloreis098/CamHome.git

# 2. Entrar na pasta
cd CamHome

# 3. Instalar as dependências do projeto (Isso instala o parcel)
# AGUARDE o término deste comando.
npm install

# 4. Compilar o projeto
npm run build

# 5. Verifique se a pasta 'dist' foi criada com sucesso
ls -F dist/
```

### 3. Implantar no Servidor Web

Mova os arquivos compilados para o diretório do Nginx.

```bash
# Criar diretório do site
sudo mkdir -p /var/www/camhome

# Copiar os arquivos da pasta 'dist' para o servidor
sudo cp -r dist/. /var/www/camhome/

# Ajustar permissões (Crítico para evitar erro 403 Forbidden)
sudo chown -R www-data:www-data /var/www/camhome
sudo chmod -R 755 /var/www/camhome
```

### 4. Configurar o Nginx

Configure o Nginx para servir a aplicação React.

1. Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/camhome
```

2. Cole o seguinte conteúdo:
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
3. Salve e saia (`Ctrl+O`, `Enter`, `Ctrl+X`).

4. Ative o site e reinicie o serviço:
```bash
# Remove o site padrão para evitar conflitos
sudo rm /etc/nginx/sites-enabled/default

# Ativa o CamHome
sudo ln -s /etc/nginx/sites-available/camhome /etc/nginx/sites-enabled/

# Reinicia o Nginx
sudo systemctl restart nginx
```

---

## 🌐 Como Acessar

1. Descubra o IP do seu Orange Pi: `hostname -I`
2. Acesse no navegador: `http://SEU_IP`
3. **Login Padrão**:
   - Usuário: `admin`
   - Senha: `password`
