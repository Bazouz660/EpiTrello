# Guide de Déploiement Fly.io - EpiTrello

Ce guide explique comment déployer EpiTrello sur Fly.io avec MongoDB Atlas.

## Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FLY.IO                                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Region: Paris (cdg)                         │ │
│  │                                                                     │ │
│  │   ┌─────────────────────┐       ┌─────────────────────┐           │ │
│  │   │      Frontend       │       │       Backend       │           │ │
│  │   │  epitrello-frontend │       │  epitrello-backend  │           │ │
│  │   │    (React/Vite)     │       │   (Node/Express)    │           │ │
│  │   │      Port 80        │       │      Port 8080      │           │ │
│  │   └─────────────────────┘       └──────────┬──────────┘           │ │
│  │                                            │                       │ │
│  └────────────────────────────────────────────┼───────────────────────┘ │
│                                               │                          │
└───────────────────────────────────────────────┼──────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │        MONGODB ATLAS            │
                              │      (Cluster M0 - Gratuit)     │
                              │       epitrello database        │
                              └─────────────────────────────────┘
```

## URLs de Production

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://epitrello-frontend.fly.dev           |
| Backend      | https://epitrello-backend.fly.dev            |
| API          | https://epitrello-backend.fly.dev/api        |
| Health Check | https://epitrello-backend.fly.dev/api/health |

## Prérequis

- Compte [Fly.io](https://fly.io) (gratuit)
- Compte [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuit)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installé
- Repository GitHub avec GitHub Actions

## Configuration Initiale

### 1. Installer Fly CLI

```powershell
# Windows (PowerShell)
irm https://fly.io/install.ps1 | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Se connecter à Fly.io

```bash
flyctl auth login
```

### 3. Créer les applications

```bash
# Backend
flyctl apps create epitrello-backend

# Frontend
flyctl apps create epitrello-frontend
```

### 4. Configurer MongoDB Atlas

1. Créer un compte sur [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Créer un cluster **M0** (gratuit)
3. **Database Access** → Créer un utilisateur avec mot de passe
4. **Network Access** → Ajouter `0.0.0.0/0` (autoriser toutes les IPs)
5. **Connect** → Copier l'URL de connexion

L'URL ressemble à :

```
mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/epitrello?retryWrites=true&w=majority
```

### 5. Configurer les secrets Fly.io

```bash
flyctl secrets set -a epitrello-backend \
  MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/epitrello?retryWrites=true&w=majority" \
  JWT_SECRET="votre-secret-jwt-32-caracteres-minimum"
```

### 6. Générer un token de déploiement

1. Aller sur [fly.io/dashboard](https://fly.io/dashboard)
2. Avatar → Account → Access Tokens
3. Créer un **Org deploy token**
4. Copier le token

### 7. Configurer GitHub

Aller dans **Settings → Secrets and variables → Actions** :

| Secret          | Description                 |
| --------------- | --------------------------- |
| `FLY_API_TOKEN` | Token de déploiement Fly.io |

## Fichiers de Configuration

### Backend (`backend/fly.toml`)

```toml
app = 'epitrello-backend'
primary_region = 'cdg'

[build]
  dockerfile = 'Dockerfile'

[env]
  NODE_ENV = 'production'
  PORT = '8080'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/api/health'

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

### Frontend (`frontend/fly.toml`)

```toml
app = 'epitrello-frontend'
primary_region = 'cdg'

[build]
  dockerfile = 'Dockerfile'
  [build.args]
    VITE_API_URL = 'https://epitrello-backend.fly.dev/api'

[http_service]
  internal_port = 80
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

## Pipeline CD (GitHub Actions)

Le workflow `.github/workflows/cd.yml` s'exécute automatiquement sur push vers `main` ou `dev` :

1. **Test** - Lint et tests unitaires
2. **Deploy Backend** - Build et déploiement sur Fly.io
3. **Deploy Frontend** - Build et déploiement sur Fly.io
4. **Summary** - Affichage des URLs

### Déclenchement manuel

1. Aller sur **GitHub → Actions → CD**
2. Cliquer **"Run workflow"**
3. Sélectionner l'environnement (staging/production)

## Déploiement Manuel

```bash
# Backend
cd backend
flyctl deploy --remote-only --app epitrello-backend --ha=false

# Frontend
cd ../frontend
flyctl deploy --remote-only --app epitrello-frontend \
  --build-arg VITE_API_URL=https://epitrello-backend.fly.dev/api \
  --ha=false
```

## Commandes Utiles

```bash
# Voir les apps
flyctl apps list

# Logs en temps réel
flyctl logs -a epitrello-backend
flyctl logs -a epitrello-frontend

# Status des machines
flyctl status -a epitrello-backend

# Ouvrir l'app dans le navigateur
flyctl open -a epitrello-frontend

# Voir les secrets configurés
flyctl secrets list -a epitrello-backend

# SSH dans une machine
flyctl ssh console -a epitrello-backend

# Redémarrer l'app
flyctl apps restart epitrello-backend
```

## Monitoring

### Dashboard Fly.io

- [fly.io/apps/epitrello-backend](https://fly.io/apps/epitrello-backend)
- [fly.io/apps/epitrello-frontend](https://fly.io/apps/epitrello-frontend)

### Health Check

```bash
curl https://epitrello-backend.fly.dev/api/health
```

Réponse attendue :

```json
{
  "status": "healthy",
  "timestamp": "2025-12-16T12:00:00.000Z",
  "uptime": 3600
}
```

## Troubleshooting

### L'app ne démarre pas

```bash
# Voir les logs
flyctl logs -a epitrello-backend

# Vérifier la config
flyctl config show -a epitrello-backend
```

### Erreur de connexion MongoDB

1. Vérifier que `MONGODB_URI` est bien configuré :

   ```bash
   flyctl secrets list -a epitrello-backend
   ```

2. Vérifier Network Access sur MongoDB Atlas (doit avoir `0.0.0.0/0`)

### Erreur "unauthorized" dans le CD

1. Régénérer un token sur [fly.io/dashboard](https://fly.io/dashboard) → Access Tokens
2. Mettre à jour le secret `FLY_API_TOKEN` sur GitHub

### L'app s'arrête après inactivité

C'est normal ! `auto_stop_machines = 'stop'` éteint les machines inactives pour économiser les ressources. Elles redémarrent automatiquement à la première requête (~2-3s de latence).

Pour garder une machine toujours active :

```toml
min_machines_running = 1
```

## Coûts

Fly.io offre gratuitement :

- 3 machines partagées (shared-cpu-1x, 256MB)
- 160GB de transfert sortant/mois

Notre configuration utilise 2 machines (backend + frontend), donc reste dans le tier gratuit.

## Alternative : Kubernetes (Oracle Cloud)

Pour une architecture plus "entreprise" avec Kubernetes, voir [deployment-k8s.md](deployment-k8s.md).
