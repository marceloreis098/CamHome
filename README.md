# CamHome Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi rodando Ubuntu Server 22.04. O **CamHome** gerencia câmeras IP, monitora armazenamento e utiliza IA para análise de quadros.

## 📋 Pré-requisitos de Hardware

- **Placa:** Orange Pi 5 (ou Raspberry Pi 4 / Mini PC com Ubuntu)
- **Sistema Operacional:** Ubuntu Server 22.04 LTS
- **Armazenamento:** Cartão SD para o sistema + HD Externo USB (para gravações)

---

## 🚀 Instalação Rápida (Recomendada)

Dentro da pasta do projeto, rode o script de configuração automática. Ele instalará o Node.js, as dependências e compilará o site.

```bash
# 1. Dar permissão de execução ao script
chmod +x setup.sh

# 2. Rodar o script
./setup.sh
```

Se tudo der certo, pule para o **Passo 3** abaixo (Implantar no Servidor Web).

---

## 🔧 Instalação Manual

Caso prefira fazer passo a passo ou o script falhe.

### 1. Instalar Dependências do Sistema
Instale o servidor web Nginx, Git e o Node.js.

```bash
# Atualizar lista de pacotes
sudo apt update
sudo apt install -y curl git nginx

# Adicionar repositório do Node.js 20 e instalar
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# VERIFICAÇÃO IMPORTANTE:
# Rode este comando. Se der erro, o Node não foi instalado.
node -v
npm -v
```

### 2. Baixar e Compilar o Projeto

Se você encontrou erro de "npm: command not found" no passo anterior, instale o gerenciador de pacotes manualmente antes de prosseguir:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

Agora, prossiga com o download e compilação:

```bash
# Clonar o repositório
git clone https://github.com/marceloreis098/CamHome.git

# Entrar na pasta
cd CamHome

# Instalar dependências do projeto
npm install

# Compilar o projeto (Gera a pasta 'dist')
npm run build

# Verifique se a pasta foi criada corretamente
ls -F dist/
```

### 3. Implantar no Servidor Web
Mova os arquivos compilados para o diretório padrão do servidor web e ajuste as permissões.

```bash
# Criar diretório do site
sudo mkdir -p /var/www/camhome

# Copiar os arquivos da pasta 'dist' para o servidor
sudo cp -r dist/. /var/www/camhome/

# Ajustar permissões (Crítico para evitar erro 403)
sudo chown -R www-data:www-data /var/www/camhome
sudo chmod -R 755 /var/www/camhome
```

### 4. Configurar o Nginx
Configure o Nginx para servir a aplicação React.

1. Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/camhome
```

2. Cole o seguinte conteúdo dentro do editor:
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
3. Salve e saia (Ctrl+O, Enter, Ctrl+X).

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

## 🌐 Como Acessar a Aplicação

### 1. Descobrir o Endereço IP
Se você não sabe o IP do seu Orange Pi, execute este comando no terminal dele:
```bash
hostname -I
```
*Anote o primeiro número que aparecer (ex: `192.168.1.55`)*

### 2. Acessar no Navegador
No seu computador ou celular (conectado à mesma rede Wi-Fi/Cabo):

1. Abra o Chrome, Firefox ou Safari.
2. Digite o IP na barra de endereços:
   `http://SEU_IP_AQUI` 
   *(Exemplo: http://192.168.1.55)*

### 3. Login Padrão
Ao carregar a tela de login, use as credenciais iniciais:

- **Usuário:** `admin`
- **Senha:** `password`
