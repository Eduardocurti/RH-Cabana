# 🍔 Cabana Hub RH — Guia de Deploy

## O que é isso?
Backend Node.js + SQLite que serve o Hub de RH da Cabana Burger.
Os dados ficam salvos em banco de dados real no servidor — qualquer pessoa que acessar o link verá e editará os mesmos dados.

---

## Deploy no Render (gratuito, 10 minutos)

### Passo 1 — Criar conta no GitHub
Se não tiver: https://github.com → "Sign up"

### Passo 2 — Criar repositório
1. No GitHub, clique em **"New repository"**
2. Nome: `cabana-hub-rh`
3. Marque **Private** (recomendado)
4. Clique em **"Create repository"**

### Passo 3 — Subir os arquivos
Na página do repositório vazio, clique em **"uploading an existing file"** e suba:
```
cabana-hub/
├── server.js
├── package.json
├── render.yaml
├── .gitignore
└── public/
    └── index.html
```
> Dica: você pode arrastar a pasta inteira `cabana-hub` para a janela do GitHub.

### Passo 4 — Criar conta no Render
https://render.com → "Get Started for Free" → entre com sua conta GitHub

### Passo 5 — Criar o serviço
1. No Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório `cabana-hub-rh`
3. Preencha:
   - **Name:** `cabana-hub-rh`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Clique em **"Advanced"** e adicione as variáveis de ambiente:
   - `HUB_PASSWORD` → `Caban@26` (ou a senha que quiser)
   - `DATA_DIR` → `/data`
5. Ainda em Advanced → **"Add Disk"**:
   - Name: `cabana-data`
   - Mount Path: `/data`
   - Size: 1 GB
6. Clique em **"Create Web Service"**

### Passo 6 — Aguardar o deploy
O Render vai instalar as dependências e iniciar o servidor (2-3 minutos).
Quando aparecer **"Live"** em verde, seu hub está no ar!

### Passo 7 — Acessar
O Render vai gerar uma URL do tipo:
```
https://cabana-hub-rh.onrender.com
```
Compartilhe essa URL com o time de RH. A senha de acesso é a que você definiu em `HUB_PASSWORD`.

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `HUB_PASSWORD` | Senha de acesso ao hub | `Caban@26` |
| `PORT` | Porta do servidor | `3000` |
| `DATA_DIR` | Pasta onde o banco SQLite é salvo | `./data` |

---

## Atualizar o hub (adicionar novas funcionalidades)
1. Edite os arquivos localmente
2. No GitHub, vá ao arquivo → clique no lápis → cole o novo conteúdo → "Commit"
3. O Render faz o redeploy automático em ~1 minuto
4. **Os dados não são perdidos** — o banco fica no disco persistente `/data`

---

## Estrutura do projeto
```
cabana-hub/
├── server.js          ← Backend Express + SQLite
├── package.json       ← Dependências Node.js
├── render.yaml        ← Configuração automática do Render
├── .gitignore
└── public/
    └── index.html     ← Frontend completo (HTML/CSS/JS)
```

## API endpoints (para referência)
```
GET  /api/pj                        → lista todos os PJs
PUT  /api/pj/:matricula             → salva/atualiza um PJ
PUT  /api/pj/batch                  → seed inicial (vários PJs)
GET  /api/nf                        → todos lançamentos de NF
PUT  /api/nf/:mesKey/:matricula     → salva/atualiza uma NF
GET  /api/ferias                    → todos os dados de férias
PUT  /api/ferias/:matricula         → salva/atualiza férias de um PJ
GET  /api/health                    → status do servidor
```
Todos os endpoints exigem o header: `Authorization: Bearer <HUB_PASSWORD>`

---

## Plano gratuito do Render — o que saber
- O serviço **dorme após 15 min de inatividade** no plano gratuito
- Primeiro acesso após inatividade pode demorar ~30 segundos para "acordar"
- Para evitar isso: plano Starter ($7/mês) mantém o serviço sempre ativo
- O **disco de dados é persistente** mesmo no plano gratuito
