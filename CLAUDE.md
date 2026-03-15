# CLAUDE.md — Shodan Geo Search

Guia de referência para desenvolvimento assistido por IA neste repositório.

## Visão geral do projeto

Aplicação web que permite buscar dispositivos (câmeras e outros) em uma área
geográfica usando a API do Shodan. O backend em Node.js/Express expõe uma API
REST que recebe latitude, longitude e raio, consulta o Shodan e devolve uma
lista de dispositivos encontrados.

**Tecnologias:**
- **Backend:** Node.js ≥ 18, Express 4
- **Frontend:** HTML5, CSS3, JavaScript vanilla (sem framework)
- **Testes:** Jest + Supertest
- **APIs externas:** Shodan API (busca de dispositivos), AwesomeAPI (CEP → coordenadas)
- **Deploy:** Docker + Traefik

## Comandos essenciais

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start               # http://localhost:3000

# Rodar testes
npm test

# Rodar testes em modo watch
npm run test:watch

# Build e execução via Docker
docker build -t shodan-geo .
docker run -p 3000:3000 -e SHODAN_API_KEY=<chave> shodan-geo
```

## Variáveis de ambiente

| Variável         | Descrição                        | Obrigatória |
|------------------|----------------------------------|-------------|
| `SHODAN_API_KEY` | Chave de API do Shodan           | Sim         |
| `PORT`           | Porta do servidor (padrão 3000)  | Não         |

Copie `.env.example` para `.env` e preencha `SHODAN_API_KEY` antes de iniciar.

## Estrutura do repositório

```
shodan-geo-search/
├── public/
│   ├── index.html              # Interface principal da busca
│   ├── styles.css              # Estilos responsivos
│   ├── script.js               # Lógica do frontend (busca, CEP, geolocalização)
│   └── dashboard/              # Build do dashboard avançado (gerado)
├── tests/
│   └── server.test.js          # Testes de integração (Jest + Supertest)
├── server.js                   # Backend Express (rotas, proxy Shodan, helpers)
├── package.json
├── jest.config.js
├── Dockerfile
└── .env.example
```

## Testes

**Arquivo de testes:** `tests/server.test.js` (16 testes, todos passando)

Os testes cobrem:
- Validação de parâmetros da rota `POST /api/search` (latitude, longitude, raio)
- Comportamento quando `SHODAN_API_KEY` não está configurada (espera HTTP 500)
- Preferência por HTTPS quando o Shodan retorna metadados SSL
- Cálculo de distância com coordenadas incluindo zero
- Propagação de erros da API do Shodan (ex: 429 Too Many Requests)
- Proxy do dashboard (`POST /api/dashboard/proxy`)
- Entrega de arquivos estáticos (index.html, styles.css, script.js, dashboard)
- Teste de integração real (`runIfKey`) para coordenadas válidas — executado
  apenas quando `SHODAN_API_KEY` real está disponível no ambiente

Para rodar um teste individualmente:
```bash
npx jest --testNamePattern="should return 400 when latitude is missing"
```

## Arquitetura e fluxo de dados

### Rota principal: `POST /api/search`

1. Valida os campos `latitude`, `longitude` e `radius` (número finito, raio > 0)
2. Verifica se `SHODAN_API_KEY` está presente no ambiente
3. Constrói a query `geo:<lat>,<lon>,<radius> camera` para o Shodan
4. Chama `https://api.shodan.io/shodan/host/search` com AbortController (timeout de 10 s)
5. Mapeia `data.matches[]` para objetos `Device`, calculando distância e protocolo
6. Retorna `{ devices: Device[] }`

### Rota de proxy: `POST /api/dashboard/proxy`

Encaminha chamadas ao Shodan do frontend do dashboard sem expor a API key.
Aceita `{ endpoint, query, apiKey }` e retorna a resposta bruta do Shodan.

## Formato da resposta da API

### `POST /api/search` — sucesso

```json
{
  "devices": [
    {
      "ip": "192.168.1.1",
      "organization": "Example Org",
      "port": 80
    }
  ]
}
```

## Códigos de erro

| Código | Situação                                                    |
|--------|-------------------------------------------------------------|
| `400`  | Parâmetros inválidos (lat/lon/raio ausentes ou não-finitos) |
| `500`  | `SHODAN_API_KEY` ausente ou erro interno do servidor        |
| `502`  | Falha na API do Shodan                                      |
| `504`  | Timeout na chamada à API do Shodan                          |

## Convenções de código

- Sem TypeScript — JavaScript puro no backend e no frontend
- Sem framework no frontend — DOM vanilla, sem React/Vue/Alpine fora do dashboard
- Fetch nativo (Node 18+) — sem axios ou node-fetch
- Variáveis de ambiente via `dotenv` apenas no backend
- Nomes de variáveis em inglês, mensagens ao usuário em português
