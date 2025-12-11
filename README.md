# CamHome Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi rodando Ubuntu Server 22.04. O **CamHome** gerencia câmeras IP, monitora armazenamento e utiliza IA para análise de quadros.

## 📋 Pré-requisitos de Hardware

- **Placa:** Orange Pi 5 (ou Raspberry Pi 4 / Mini PC com Ubuntu)
- **Sistema Operacional:** Ubuntu Server 22.04 LTS
- **Armazenamento:** Cartão SD para o sistema + HD Externo USB (para gravações)

---

## 🔧 Guia de Instalação (Passo a Passo)

Siga estes passos na ordem exata. Este guia foi revisado para evitar erros comuns de dependências no Ubuntu Server.

### Passo 1: Preparar o Sistema
Antes de tudo, vamos garantir que o sistema tem os utilitários básicos para baixar os repositórios.

```bash
# 1. Atualizar o sistema e instalar curl e git
sudo apt update
sudo apt install -y curl git ca-certificates gnupg
```

### Passo 2: Adicionar Repositório Node.js 20 (NodeSource)
O Ubuntu vem com uma versão antiga do Node. Vamos adicionar o repositório oficial da versão 20 (LTS).

```bash
# 1. Baixar e executar o script de configuração do repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 2. Instalar o Node.js
sudo apt install -y nodejs

# 3. VERIFICAÇÃO CRÍTICA:
# Rode os comandos abaixo. Se aparecerem números de versão, funcionou.
# Se der erro, PARE e repita o passo anterior.
node -v
npm -v
```

### Passo 3: Baixar e Instalar o CamHome
Agora que o ambiente está pronto, vamos instalar o software.

```bash
# 1. Clonar o repositório
git clone https://github.com/marceloreis098/CamHome.git

# 2. Entrar na pasta do projeto
cd CamHome

# 3. Instalar dependências do projeto
# IMPORTANTE: Este comando instala o 'parcel' que causava erro anteriormente.
# Aguarde até que a barra de progresso termine.
npm install

# 4. Compilar o projeto (Build)
# Se o passo 3 funcionou, este comando criará a pasta 'dist'
npm run build
```

**Se o comando acima funcionar, você verá uma mensagem: `✨ Built in X.XXs`**

### Passo 4: Configurar o Servidor Web (Nginx)
Vamos configurar o Nginx para servir os arquivos que acabamos de compilar.

```bash
# 1. Instalar Nginx (caso não tenha instalado no passo 1)
sudo apt install -y nginx

# 2. Criar diretório do site e copiar arquivos
sudo mkdir -p /var/www/camhome
sudo cp -r dist/. /var/www/camhome/

# 3. Ajustar permissões (Evita erro 403 Forbidden)
sudo chown -R www-data:www-data /var/www/camhome
sudo chmod -R 755 /var/www/camhome
```

### Passo 5: Ativar o Site

1. Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/camhome
```

2. Cole o conteúdo abaixo no editor:
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

## 🆘 Solução de Problemas Comuns

**Erro: `sh: 1: parcel: not found`**
- **Causa:** O comando `npm install` não foi executado ou falhou.
- **Solução:** Dentro da pasta `CamHome`, delete a pasta `node_modules` e tente novamente:
  ```bash
  rm -rf node_modules
  npm install
  npm run build
  ```

**Erro: `EACCES: permission denied`**
- **Causa:** Você rodou o npm com `sudo` ou permissões de pasta erradas.
- **Solução:** Corrija a propriedade da pasta:
  ```bash
  sudo chown -R $USER:$(id -gn $USER) ~/CamHome
  ```
