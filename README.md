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

Siga estes passos para colocar o servidor no ar em poucos minutos.

### 1. Preparar e Baixar (Via Git)
Instale o git e baixe os arquivos do projeto para o seu Orange Pi.

```bash
# 1.1 Atualizar pacotes e instalar Git
sudo apt update && sudo apt install -y git

# 1.2 Clonar o repositório
git clone https://github.com/seu-usuario/orangeguard.git

# 1.3 Entrar na pasta do projeto
cd orangeguard
```

### 2. Corrigir e Preparar Script
**Importante:** Execute estes comandos para corrigir problemas de formatação de arquivo (erro "No such file") e dar permissão de execução.

```bash
# Remove caracteres do Windows (CRLF) que causam erro no Linux
sed -i 's/\r$//' install.sh

# Torna o script executável
chmod +x install.sh
```

### 3. Executar Instalação
Agora que o arquivo está corrigido, inicie a instalação automática.

```bash
sudo ./install.sh
```

*Aguarde a mensagem "Instalação Concluída com Sucesso!".*

---

## 🆘 Solução de Problemas

### Erro: `unable to execute ./install.sh: No such file or directory`
Se você ver este erro, significa que o passo 2 foi pulado ou falhou. O Linux não consegue ler o arquivo criado no Windows.
**Solução:** Execute `sed -i 's/\r$//' install.sh` e tente novamente.

---

## 🔧 Instalação Manual

Se o script falhar, você pode fazer manualmente:

1. **Instalar Node.js 20 e Nginx:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx
   ```

2. **Compilar o Projeto:**
   ```bash
   npm install
   npm run build
   ```

3. **Configurar Nginx:**
   Copie os arquivos de `dist/` para `/var/www/orangeguard` e aponte o Nginx para lá.

4. **Diretórios:**
   Crie a pasta `/mnt/orange_drive_1tb` para simular o HD externo.