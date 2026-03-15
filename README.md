# Shodan Geo Search

![Tests](https://img.shields.io/badge/tests-10%2F10%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

Aplicação web com backend em Node.js/Express e frontend em HTML, CSS e JavaScript vanilla para buscar dispositivos por geolocalização usando a API do Shodan.

## Funcionalidades

- 🔍 Busca de dispositivos por latitude, longitude e raio
- 🎨 Interface responsiva e moderna
- 🐙 Suporte a Docker
- ✅ Testes E2E com Jest
- 🔒 Segurança: API key protegida via variáveis de ambiente

## Demo

Acesse: https://shodan.proframos.com

## Como usar

### Local

1. Clone o repositório:
   ```bash
   git clone https://github.com/prof-ramos/shodan-geo-search.git
   cd shodan-geo-search
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure a API key:
   ```bash
   cp .env.example .env
   # Edite .env e adicione sua SHODAN_API_KEY
   ```

4. Rode a aplicação:
   ```bash
   npm start
   ```

5. Acesse `http://localhost:3000`

### Docker

```bash
# Build
docker build -t shodan-geo .

# Run
docker run -p 3000:3000 -e SHODAN_API_KEY=sua_chave shodan-geo
```

## Testes

```bash
# Rodar testes
npm test

# Rodar com watch
npm run test:watch
```

**Cobertura atual:** 10/10 testes passando ✅

## Estrutura do Projeto

```
shodan-geo-search/
├── public/
│   ├── index.html      # Interface principal
│   ├── styles.css      # Estilos responsivos
│   └── script.js       # Lógica do frontend
├── tests/
│   └── server.test.js  # Testes E2E
├── server.js           # Backend Express
├── package.json        # Dependências
├── Dockerfile          # Container config
└── .env.example        # Template de ambiente
```

## API

### POST /api/search

Busca dispositivos por geolocalização.

**Request:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "radius": 25
}
```

**Response:**
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

## Tecnologias

- **Backend:** Node.js, Express
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Testes:** Jest, Supertest
- **API:** Shodan API
- **Deploy:** Docker, Traefik

## Obtendo uma API Key do Shodan

1. Acesse https://www.shodan.io
2. Crie uma conta gratuita
3. Vá em https://developer.shodan.io/api
4. Copie sua API Key

## Licença

MIT

## Autor

**Gabriel Ramos**
- GitHub: [@prof-ramos](https://github.com/prof-ramos)
- Website: https://proframos.com
