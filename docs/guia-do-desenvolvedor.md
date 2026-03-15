# Guia do Desenvolvedor

Este guia reúne as informações principais para configurar, executar, evoluir e depurar o projeto `shodan-geo-search`.

## 1. Instruções de configuração

### Pré-requisitos

- Node.js 18 ou superior
- npm
- Uma chave válida da API do Shodan

Observação: este repositório é baseado em Node.js. As diretrizes de `uv` para Python não se aplicam aqui porque não há aplicação Python no projeto.

### Instalação do backend

Na raiz do projeto:

```bash
npm install
```

### Instalação do frontend React do dashboard

O dashboard avançado vive em `client/` e precisa de dependências próprias:

```bash
npm run dashboard:install
```

### Configuração de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Defina pelo menos:

```env
SHODAN_API_KEY=sua_chave_valida
PORT=3000
```

### Build do dashboard

O dashboard React é compilado para `public/dashboard/`:

```bash
npm run dashboard:build
```

### Inicialização da aplicação

```bash
npm start
```

URLs locais:

- Interface principal: `http://localhost:3000/`
- Dashboard avançado: `http://localhost:3000/dashboard/`

## 2. Visão geral da estrutura do projeto

### Arquivos e diretórios principais

```text
shodan-geo-search/
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   └── ShodanDashboard.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── dashboard-avancado.png
│   └── guia-do-desenvolvedor.md
├── outputs/
│   └── relatorios/
├── public/
│   ├── dashboard/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── tests/
│   └── server.test.js
├── .env.example
├── .gitignore
├── Dockerfile
├── jest.config.js
├── package.json
├── README.md
└── server.js
```

### Responsabilidade de cada parte

- `server.js`
  Implementa o servidor Express, a busca geográfica principal (`POST /api/search`), o proxy do dashboard (`POST /api/dashboard/proxy`) e a entrega dos assets estáticos.

- `public/index.html`
  Estrutura da interface principal de busca por CEP, latitude, longitude e raio.

- `public/script.js`
  Controla o formulário principal, busca de CEP via AwesomeAPI, preenchimento automático das coordenadas, geolocalização do navegador e renderização dos resultados.

- `public/styles.css`
  Define o visual da interface principal. Hoje a página segue uma direção visual cyberpunk.

- `client/src/ShodanDashboard.jsx`
  Interface React do dashboard avançado para consultas manuais na API do Shodan.

- `client/vite.config.js`
  Configuração de build do dashboard. O `base` está configurado como `/dashboard/` para que os assets sejam servidos corretamente pelo Express.

- `tests/server.test.js`
  Testes automatizados da API Express e da entrega de arquivos estáticos.

- `outputs/relatorios/`
  Pasta local para relatórios gerados durante uso ou análise. Esta pasta não deve ser commitada.

## 3. Fluxo de trabalho de desenvolvimento

### Fluxo recomendado

1. Instale dependências da raiz:

```bash
npm install
```

2. Instale dependências do dashboard:

```bash
npm run dashboard:install
```

3. Configure o `.env` com uma chave válida do Shodan.

4. Quando houver mudança no dashboard React, gere o build:

```bash
npm run dashboard:build
```

5. Inicie a aplicação:

```bash
npm start
```

6. Rode os testes:

```bash
npm test -- --runInBand
```

### Quando editar cada camada

- Se a mudança for na busca principal por coordenadas, normalmente você editará:
  - `server.js`
  - `public/index.html`
  - `public/script.js`
  - `public/styles.css`

- Se a mudança for no dashboard avançado, normalmente você editará:
  - `client/src/ShodanDashboard.jsx`
  - `client/vite.config.js`
  - depois rodará `npm run dashboard:build`

### Boas práticas específicas deste repositório

- Não chame a API pública do Shodan diretamente do navegador para o dashboard.
  Use sempre o proxy backend em `POST /api/dashboard/proxy`.

- Não assuma que um serviço é HTTPS apenas porque está na porta 443.
  O backend já considera metadata SSL e portas TLS comuns.

- Não salve artefatos temporários no Git.
  Itens como `.omc/state/`, `outputs/relatorios/` e arquivos de debug local devem ficar ignorados.

## 4. Abordagem de teste

### Ferramenta usada

- Jest
- Supertest

### O que é coberto hoje

Os testes em `tests/server.test.js` validam:

- entradas inválidas para `POST /api/search`
- ausência de `SHODAN_API_KEY`
- montagem correta de URLs com HTTPS em portas TLS não padrão
- cálculo de distância com coordenadas contendo `0`
- tratamento de erro vindo da API do Shodan
- proxy do dashboard
- entrega dos assets estáticos principais
- entrega do dashboard em `/dashboard/`

### Como rodar a suíte

```bash
npm test -- --runInBand
```

Para modo watch:

```bash
npm run test:watch
```

### Estratégia de teste ao alterar o projeto

- Mudou `server.js`: rode a suíte completa.
- Mudou `client/src/ShodanDashboard.jsx`: rode `npm run dashboard:build` e depois `npm test -- --runInBand`.
- Mudou só `public/styles.css` ou `public/index.html`: valide visualmente no navegador, além de manter a suíte verde.

## 5. Etapas comuns de solução de problemas

### Problema: `401 Unauthorized` ao consultar o Shodan

Sintoma:

- `api-info` falha
- `POST /api/search` retorna erro da API
- dashboard não consegue consultar resultados

Passos:

1. Valide a chave diretamente:

```bash
curl "https://api.shodan.io/api-info?key=SUA_CHAVE"
```

2. Se não voltar JSON, a chave está inválida, revogada ou incompleta.

3. Atualize o `.env` e reinicie o servidor.

### Problema: dashboard mostra `Failed to fetch`

Possíveis causas:

- build do dashboard não foi gerado
- servidor não foi reiniciado após mudança relevante
- chamada estava tentando sair direto do browser para a API pública

Passos:

1. Rebuild do dashboard:

```bash
npm run dashboard:build
```

2. Reinicie a aplicação:

```bash
npm start
```

3. Verifique se `/dashboard/` abre corretamente.

4. Confirme que a UI está usando `/api/dashboard/proxy`, não `https://api.shodan.io/...` diretamente.

### Problema: assets do dashboard não carregam em `/dashboard/`

Sintoma:

- a página abre, mas o JS do dashboard quebra
- erro de asset path no navegador

Passos:

1. Verifique se `client/vite.config.js` mantém:

```js
base: '/dashboard/'
```

2. Rode novamente:

```bash
npm run dashboard:build
```

3. Confirme que `public/dashboard/index.html` referencia `/dashboard/assets/...`

### Problema: busca automática de CEP não preenche coordenadas

Passos:

1. Teste a API de CEP:

```bash
curl "https://cep.awesomeapi.com.br/json/70390125"
```

2. Confirme que a resposta contém `lat` e `lng`.

3. Verifique no navegador se o CEP foi digitado com 8 dígitos.

4. Se necessário, teste manualmente o botão de busca de CEP.

### Problema: porta `3000` já está em uso

Sintoma:

- erro `EADDRINUSE`

Passos:

1. Descubra o processo:

```bash
lsof -iTCP:3000 -sTCP:LISTEN -n -P
```

2. Encerre o processo existente ou troque a porta no `.env`.

### Problema: relatórios aparecem no `git status`

Passos:

1. Confirme que os arquivos estão dentro de:

```text
outputs/relatorios/
```

2. Verifique se `.gitignore` contém:

```text
outputs/relatorios/
```

3. Se algum arquivo já foi rastreado antes, remova do índice:

```bash
git rm --cached caminho/do/arquivo
```

## Comandos úteis

### Instalação

```bash
npm install
npm run dashboard:install
```

### Build e execução

```bash
npm run dashboard:build
npm start
```

### Testes

```bash
npm test -- --runInBand
npm run test:watch
```

### Verificações rápidas

```bash
curl "http://localhost:3000/"
curl "http://localhost:3000/dashboard/"
curl "https://api.shodan.io/api-info?key=SUA_CHAVE"
curl "https://cep.awesomeapi.com.br/json/70390125"
```
