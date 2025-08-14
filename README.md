# 🔍 Hunter Email Finder Pro - Extensão Chrome

Uma extensão completa para encontrar emails profissionais usando a API oficial do Hunter.io, similar ao Hunter Email Finder e GetProspect.

## ✨ Funcionalidades

### 🎯 Busca por Domínio
- Encontre todos os emails de uma empresa usando apenas o domínio
- Veja informações detalhadas: nome, cargo, confiabilidade
- Estatísticas em tempo real dos emails encontrados

### 🌐 Extração de Páginas
- Extraia emails diretamente da página atual
- Botão flutuante para acesso rápido
- Combinação de API + extração de conteúdo

### 👤 Busca de Pessoas
- Encontre o email específico de uma pessoa
- Digite nome, sobrenome e domínio da empresa
- Alta precisão na busca personalizada

### 📊 Funcionalidades Avançadas
- Exportação para CSV
- Cópia rápida com um clique
- Menu de contexto integrado
- Interface responsiva e moderna
- Notificações em tempo real

## 🚀 Instalação

### 1. Baixar os Arquivos
Salve todos os arquivos em uma pasta chamada `hunter-extension`:

```
hunter-extension/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── content.css
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### 2. Criar os Ícones
Crie a pasta `icons` e adicione os ícones nos tamanhos:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px) 
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

**Dica:** Use um gerador online como [Favicon.io](https://favicon.io/) para criar os ícones.

### 3. Instalar no Chrome

1. **Abra o Chrome** e vá para `chrome://extensions/`

2. **Ative o Modo Desenvolvedor** (toggle no canto superior direito)

3. **Clique em "Carregar sem compactação"**

4. **Selecione a pasta** `hunter-extension`

5. **Pronto!** A extensão aparecerá na barra de ferramentas

## 🔑 Configuração da API

### 1. Obter API Key do Hunter.io

1. Visite [hunter.io/api](https://hunter.io/api)
2. Crie uma conta gratuita
3. Copie sua API Key

### 2. Configurar na Extensão

1. **Clique no ícone** da extensão
2. **Cole sua API Key** no campo indicado
3. **Clique em "Salvar API Key"**
4. **Pronto!** A extensão está configurada

## 💡 Como Usar

### Busca por Domínio
1. Clique no ícone da extensão
2. Na aba "Por Domínio", digite o domínio (ex: `google.com`)
3. Clique em "Buscar Emails do Domínio"
4. Veja os resultados com estatísticas detalhadas

### Extração da Página
1. Navegue para qualquer site
2. Clique no botão flutuante 🔍 ou use a extensão
3. Na aba "Esta Página", clique em "Extrair Emails"
4. Veja emails encontrados na página + API

### Busca de Pessoa
1. Na aba "Buscar Email"
2. Digite o domínio da empresa
3. Insira nome e sobrenome da pessoa
4. Clique em "Encontrar Email"

### Menu de Contexto
- **Clique direito** em qualquer página para:
  - Extrair emails da página atual
  - Buscar emails do domínio atual
  - Encontrar email de pessoa selecionada

## 📈 Recursos da API Hunter

### Plano Gratuito
- **50 consultas/mês**
- Busca por domínio
- Verificação de emails
- Busca de pessoas

### Planos Pagos
- Até 50.000 consultas/mês
- Bulk processing
- Campanhas de email
- Integrações avançadas

## 🛠️ Desenvolvimento

### Estrutura do Código

- **`manifest.json`** - Configurações da extensão
- **`popup.html/js`** - Interface principal
- **`content.js`** - Script de extração de páginas
- **`background.js`** - Service worker e menus
- **`content.css`** - Estilos para página

### APIs Utilizadas

- **Hunter.io API v2**
  - `/domain-search` - Busca por domínio
  - `/email-finder` - Busca pessoa específica
  - `/email-verifier` - Verificação de emails

- **Chrome Extensions API**
  - `chrome.storage` - Armazenamento local
  - `chrome.tabs` - Interação com abas
  - `chrome.contextMenus` - Menu direito
  - `chrome.notifications` - Notificações

## 🔒 Privacidade

- **Dados locais:** API Key armazenada localmente
- **Sem rastreamento:** Nenhum dado enviado para terceiros
- **HTTPS apenas:** Todas as requisições são seguras
- **Código aberto:** Transparência total

## 🤝 Contribuições

1. **Fork** o projeto
2. **Crie** uma feature branch
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📞 Suporte

- **Issues:** Reporte bugs e sugira melhorias
- **Email:** Para suporte técnico
- **Wiki:** Documentação detalhada

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

---

**⚡ Dica:** Para melhores resultados, use a extensão em sites corporativos, páginas "Sobre Nós", "Equipe" e perfis do LinkedIn!