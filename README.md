# OrangeGuard Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi rodando Ubuntu Server 22.04. O sistema gerencia câmeras IP, monitora armazenamento e utiliza IA para análise de quadros.

## 📋 Pré-requisitos de Hardware

- **Placa:** Orange Pi 5 (ou Raspberry Pi 4 / Mini PC com Ubuntu)
- **Sistema Operacional:** Ubuntu Server 22.04 LTS
- **Armazenamento:** Cartão SD para o sistema + HD Externo USB (para gravações)

---

## 🔧 Instalação Manual (Passo a Passo)

Siga estes comandos no terminal do seu servidor para colocar a aplicação no ar.

### 1. Instalar Dependências do Sistema
Instale o servidor web Nginx, Git e o Node.js (versão 20).

```bash
# Atualizar lista de pacotes
sudo apt update
sudo apt install -y curl git nginx

# Adicionar repositório do Node.js 20 e instalar
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Baixar e Compilar o Projeto
Baixe o código fonte e gere os arquivos otimizados para produção.

```bash
# Clonar o repositório (substitua a URL se necessário)
git clone https://github.com/seu-usuario/orangeguard.git

# Entrar na pasta
cd orangeguard

# Instalar dependências do projeto
npm install

# Compilar o projeto (Gera a pasta 'dist')
npm run build
```

### 3. Implantar no Servidor Web
Mova os arquivos compilados para o diretório padrão do servidor web e ajuste as permissões.

```bash
# Criar diretório do site
sudo mkdir -p /var/www/orangeguard

# Copiar os arquivos da pasta 'dist' para o servidor
sudo cp -r dist/* /var/www/orangeguard/

# Ajustar permissões (Crítico para evitar erro 403)
sudo chown -R www-data:www-data /var/www/orangeguard
sudo chmod -R 755 /var/www/orangeguard
```

### 4. Configurar o Nginx
Configure o Nginx para servir a aplicação React.

1. Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/orangeguard
```

2. Cole o seguinte conteúdo dentro do editor:
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
3. Salve e saia (Ctrl+O, Enter, Ctrl+X).

4. Ative o site e reinicie o serviço:
```bash
# Remove o site padrão para evitar conflitos
sudo rm /etc/nginx/sites-enabled/default

# Ativa o OrangeGuard
sudo ln -s /etc/nginx/sites-available/orangeguard /etc/nginx/sites-enabled/

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

> **Nota:** Recomendamos alterar a senha na aba "Configurações" após o primeiro acesso.
