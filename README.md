# Daily Diet

Aplicação fullstack para registrar refeições, acompanhar métricas e manter os dados de cada usuário protegidos por autenticação.

## Requisitos

- Node.js 18 ou superior
- npm

## Executar localmente

Na raiz do projeto:

```bash
npm install
npm run dev
```

No PowerShell do Windows, se a execução de scripts bloquear `npm`, use `npm.cmd` nos mesmos comandos (`npm.cmd install` e `npm.cmd run dev`).

O frontend estará em `http://localhost:5173` e a API em `http://localhost:3333`. O Vite encaminha as chamadas `/api` para o backend.

Para produção, defina `JWT_SECRET` com um valor longo e aleatório. Opcionalmente, configure `PORT` e `CLIENT_URL` no ambiente do backend. Os registros são armazenados em `backend/data/database.json`, criado automaticamente na primeira execução; mantenha esse arquivo fora do controle de versão e faça backups apropriados.

## Funcionalidades

- Cadastro e login com senha armazenada em hash e token JWT.
- Criar, listar, visualizar, editar e apagar refeições.
- Refeições vinculadas ao usuário autenticado; operações de leitura e alteração respeitam essa propriedade.
- Métricas por usuário: total, dentro/fora da dieta e melhor sequência consecutiva dentro da dieta.
- Interface responsiva em português, com formulário, listagem, edição, exclusão e painel de progresso.

## Rotas da API

| Método | Rota | Acesso |
|---|---|---|
| `GET` | `/api/health` | Público |
| `POST` | `/api/users` | Público — cadastro (`name`, `email`, `password`) |
| `POST` | `/api/sessions` | Público — login (`email`, `password`) |
| `GET` | `/api/me` | Autenticado |
| `GET` | `/api/meals` | Autenticado |
| `POST` | `/api/meals` | Autenticado |
| `GET` | `/api/meals/:id` | Autenticado |
| `PUT` | `/api/meals/:id` | Autenticado |
| `DELETE` | `/api/meals/:id` | Autenticado |
| `GET` | `/api/metrics` | Autenticado |

Nas rotas autenticadas, envie `Authorization: Bearer <token>`. O cadastro de refeição recebe `name`, `description`, `dateTime` (data ISO 8601) e `isOnDiet` (booleano).
