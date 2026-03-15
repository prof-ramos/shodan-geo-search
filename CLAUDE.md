# CLAUDE.md — Guia para Assistentes de IA no Shodan Geo Search

## Visão Geral do Projeto

**Shodan Geo Search** é uma aplicação web em Node.js/Express que permite buscar dispositivos conectados à internet por localização geográfica usando a [API do Shodan](https://www.shodan.io/). O usuário informa latitude, longitude e raio; o backend consulta o Shodan e exibe os resultados em uma tabela.

- **Demo ao vivo:** https://shodan.proframos.com
- **Idioma da interface:** Português (pt-BR)
- **Stack:** Node.js + Express (backend), Vanilla JS + HTML + CSS (frontend)

---

## Estrutura do Repositório

```
shodan-geo-search/
├── public/              # Arquivos estáticos do frontend (servidos pelo Express)
│   ├── index.html       # Interface principal — formulário de busca e tabela de resultados (pt-BR)
│   ├── script.js        # Lógica do cliente: envio do formulário, fetch e renderização
│   └── styles.css       # CSS responsivo com variáveis, gradientes e glassmorphism
├── tests/
│   └── server.test.js   # Testes end-to-end com Jest + Supertest (10 testes)
├── server.js            # Ponto de entrada do Express — rotas, validação, arquivos estáticos
├── package.json         # Scripts, dependências, requisito Node ≥18
├── jest.config.js       # Configuração do Jest — cobertura de server.js e public/**/*.js
├── Dockerfile           # Imagem Node 22 Alpine multi-stage
├── .env.example         # Modelo de variáveis de ambiente
└── README.md            # Documentação de instalação, uso e API (em português)
```

---

## Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js ≥ 18.0.0
- Chave de API do Shodan (https://account.shodan.io/)

### Instalação Local

```bash
# Instalar dependências
npm install

# Copiar e preencher as variáveis de ambiente
cp .env.example .env
# Editar .env — definir SHODAN_API_KEY e, opcionalmente, PORT

# Iniciar o servidor
npm start
# Servidor disponível em http://localhost:3000 (ou $PORT)
```

### Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `SHODAN_API_KEY` | Sim | — | Chave de API do Shodan para busca de dispositivos |
| `PORT` | Não | 3000 | Porta HTTP do servidor |

### Docker

```bash
docker build -t shodan-geo-search .
docker run -p 3000:3000 -e SHODAN_API_KEY=sua_chave shodan-geo-search
```

---

## Executando os Testes

```bash
# Rodar todos os testes com relatório de cobertura
npm test

# Rodar em modo watch durante o desenvolvimento
npm run test:watch
```

**Framework de testes:** Jest 30 + Supertest 7

**Arquivo de testes:** `tests/server.test.js` (10 testes, todos passando)

**Suítes de teste:**
1. `POST /api/search` — Validação de entrada (parâmetros ausentes, raio negativo, valores não numéricos, chave de API ausente, entrada válida)
2. Servindo arquivos estáticos — `index.html`, `styles.css`, `script.js` acessíveis

**Cobertura** é coletada de `server.js` e `public/**/*.js`. Relatórios são gerados em `coverage/` (ignorado pelo git).

---

## Endpoint da API

### `POST /api/search`

Recebe JSON no corpo; retorna resultados de dispositivos do Shodan.

**Corpo da requisição:**
```json
{
  "latitude": "48.8566",
  "longitude": "2.3522",
  "radius": "10"
}
```

**Resposta de sucesso (`200`):**
```json
{
  "matches": [ ... ],
  "total": 42
}
```

**Respostas de erro:**
- `400` — Parâmetros ausentes ou inválidos (latitude, longitude e radius devem ser numéricos; radius deve ser positivo)
- `500` — `SHODAN_API_KEY` ausente ou falha na API do Shodan

---

## Convenções de Código

### Backend (`server.js`)
- **Sistema de módulos:** CommonJS (`require()` / `module.exports`)
- **Nomenclatura:** camelCase para variáveis e funções
- **Tratamento de erros:** blocos `try/catch`; respostas de erro em JSON com `{ error: "..." }`
- **Validação:** validar todas as entradas antes de chamar APIs externas
- **Sem imports desnecessários** — manter dependências mínimas

### Frontend (`public/script.js`)
- **Vanilla JS puro** — sem frameworks ou bundlers
- **Async/await** em todas as chamadas fetch
- **Acesso ao DOM:** `document.getElementById()` e `innerHTML` para renderização
- **Tratamento de erros:** `try/catch` em torno do fetch; mensagens de erro amigáveis em português

### HTML (`public/index.html`)
- **HTML5 semântico** — usa `<main>`, `<form>`, `<table>`
- **Acessibilidade** — `aria-live="polite"` nos contêineres de status
- **Inputs do formulário** — usar `type="number"`, `step="any"`, `required`
- **Idioma:** `lang="pt-BR"` — todo o texto da interface em português

### CSS (`public/styles.css`)
- **Propriedades customizadas CSS** para cores e sombras
- **CSS Grid** para layout do formulário
- **Breakpoints responsivos:** 880px e 560px
- **Efeitos modernos:** gradientes, `backdrop-filter`, transições

### Testes (`tests/server.test.js`)
- Um bloco `describe` por área de funcionalidade
- `beforeAll` / `afterAll` para ciclo de vida da aplicação
- Nomes de testes descritivos em inglês
- Asserções com matchers do Jest (`.toBe()`, `.toContain()`, `.toBeDefined()`)
- Testes não devem chamar a API real do Shodan (chave ausente aciona o caminho de erro 500)

---

## Fluxos de Trabalho para Assistentes de IA

### Adicionando uma Nova Funcionalidade
1. Ler `server.js` para entender a estrutura de rotas existente antes de adicionar novas
2. Adicionar rota no `server.js` com validação de entrada
3. Atualizar `public/script.js` para novas interações do cliente
4. Adicionar testes em `tests/server.test.js` cobrindo os caminhos de sucesso e erro
5. Executar `npm test` — todos os 10+ testes devem passar antes do commit

### Modificando a Lógica de Validação
- A validação fica em `server.js` dentro do handler `POST /api/search`
- Espelhar mudanças do backend no feedback de UX do frontend (`public/script.js`)
- Atualizar ou adicionar testes correspondentes em `tests/server.test.js`

### Alterando a Interface
- A estrutura HTML está em `public/index.html`; manter HTML semântico e texto em pt-BR
- Os estilos estão em `public/styles.css`; usar as variáveis CSS existentes para cores
- Não introduzir frameworks JS ou ferramentas de build — o frontend é intencionalmente vanilla

### Alterando Dependências
- Adicionar apenas dependências genuinamente necessárias
- Dependências de produção em `dependencies`; ferramentas de teste/dev em `devDependencies`
- Executar `npm test` após qualquer alteração de dependência para confirmar que nada quebrou

---

## Observações Importantes

- **Nunca commitar `.env`** — está no gitignore; `.env.example` é o modelo
- **`coverage/`** está no gitignore — não commitar relatórios de cobertura
- **`node_modules/`** está no gitignore — sempre executar `npm install` após clonar
- O Dockerfile usa `npm ci --only=production` — devDependencies não estão na imagem
- Node ≥ 18 é obrigatório; o Dockerfile usa Node 22 Alpine
- Todo o texto voltado ao usuário deve estar em **português (pt-BR)**; manter essa consistência ao adicionar textos na interface
