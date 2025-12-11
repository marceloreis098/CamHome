# OrangeGuard Surveillance System

Sistema de vigilância leve e inteligente projetado para Orange Pi (Ubuntu Server 22.04).

## 📋 Pré-requisitos

- **Hardware:** Orange Pi 5 (ou similar)
- **OS:** Ubuntu Server 22.04 LTS
- **Armazenamento:** HD Externo 1TB (recomendado) conectado via USB
- **Câmeras:** 
  - Yoosee (IP: 192.168.1.2)
  - Microseven (IP: 192.168.1.25)

## 🚀 Instalação e Correção

Se você está vendo um erro **403 Forbidden** ou problemas de acesso, utilize o script de correção incluído.

### Passo a Passo

1. **Baixar o Código (Se ainda não baixou)**
   ```bash
   sudo apt update && sudo apt install -y git
   git clone https://github.com/seu-usuario/orangeguard.git
   cd orangeguard
   ```

2. **Executar Script de Correção**
   Este script compila o projeto, move os arquivos para o servidor web e corrige as permissões automaticamente.
   
   ```bash
   # Dar permissão de execução
   chmod +x fix_deployment.sh
   
   # Rodar a correção
   sudo ./fix_deployment.sh
   ```

3. **Acessar o Painel**
   Ao final, o script mostrará o IP de acesso (Ex: `http://192.168.1.55`).
   
   **Login Padrão:**
   - **Usuário:** `admin`
   - **Senha:** `password`

---

## 🔧 Estrutura do Projeto

- **/src**: Código fonte React
- **/dist**: Arquivos compilados para produção
- **/var/www/orangeguard**: Local onde o site roda no servidor

## 🆘 Solução de Problemas Comuns

### 1. Erro `403 Forbidden`
Isso acontece quando o Nginx não tem permissão para ler os arquivos.
**Solução:** Rode `./fix_deployment.sh`.

### 2. Erro `unable to execute ./fix_deployment.sh: No such file`
Se o arquivo foi salvo no Windows, pode ter quebras de linha incorretas.
**Solução:**
```bash
sed -i 's/\r$//' fix_deployment.sh
sudo ./fix_deployment.sh
```

### 3. Página em Branco
Se a página carregar mas ficar branca, verifique se o build foi bem sucedido.
Tente rodar `npm run build` manualmente para ver erros.
