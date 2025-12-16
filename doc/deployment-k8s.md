# Guide de Déploiement Kubernetes - EpiTrello

Ce guide explique comment déployer EpiTrello sur un cluster Kubernetes (K3s) avec Oracle Cloud Free Tier.

## Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ORACLE CLOUD FREE TIER                         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         VM ARM Ampere                               │ │
│  │                     (4 OCPU, 24GB RAM)                             │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │                    K3s Cluster                               │  │ │
│  │  │                                                              │  │ │
│  │  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │  │ │
│  │  │   │   Traefik   │  │   CoreDNS   │  │  Local Path     │    │  │ │
│  │  │   │  (Ingress)  │  │    (DNS)    │  │  Provisioner    │    │  │ │
│  │  │   └──────┬──────┘  └─────────────┘  └─────────────────┘    │  │ │
│  │  │          │                                                   │  │ │
│  │  │   ┌──────▼──────────────────────────────────────────────┐   │  │ │
│  │  │   │              Namespace: epitrello                    │   │  │ │
│  │  │   │                                                      │   │  │ │
│  │  │   │  ┌─────────┐   ┌─────────┐   ┌────────────────┐    │   │  │ │
│  │  │   │  │Frontend │   │ Backend │   │    MongoDB     │    │   │  │ │
│  │  │   │  │  x2     │   │   x2    │   │ (StatefulSet)  │    │   │  │ │
│  │  │   │  └─────────┘   └─────────┘   └───────┬────────┘    │   │  │ │
│  │  │   │                                      │              │   │  │ │
│  │  │   │                              ┌───────▼────────┐    │   │  │ │
│  │  │   │                              │      PVC       │    │   │  │ │
│  │  │   │                              │   (5GB data)   │    │   │  │ │
│  │  │   │                              └────────────────┘    │   │  │ │
│  │  │   └──────────────────────────────────────────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prérequis

### 1. Créer un compte Oracle Cloud

1. Aller sur [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Créer un compte (carte bancaire requise mais non débitée)
3. Sélectionner une région proche (ex: Frankfurt, Amsterdam)

### 2. Créer une VM ARM Ampere

```bash
# Dans la console Oracle Cloud :
# Compute → Instances → Create Instance

# Configuration recommandée :
# - Shape: VM.Standard.A1.Flex (ARM)
# - OCPU: 4 (gratuit jusqu'à 4)
# - RAM: 24GB (gratuit jusqu'à 24GB)
# - OS: Ubuntu 22.04 (Canonical)
# - Boot volume: 100GB
```

### 3. Configurer le réseau (Security List)

Ouvrir les ports suivants dans la Security List :

| Port | Protocol | Source    | Description    |
| ---- | -------- | --------- | -------------- |
| 22   | TCP      | Votre IP  | SSH            |
| 80   | TCP      | 0.0.0.0/0 | HTTP           |
| 443  | TCP      | 0.0.0.0/0 | HTTPS          |
| 6443 | TCP      | Votre IP  | Kubernetes API |

## Installation de K3s

### 1. Se connecter à la VM

```bash
ssh -i <votre-clé.pem> ubuntu@<IP-PUBLIQUE>
```

### 2. Installer K3s

```bash
# Installation de K3s (version légère de Kubernetes)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --tls-san <IP-PUBLIQUE>

# Vérifier l'installation
sudo kubectl get nodes
```

### 3. Installer Traefik (Ingress Controller)

```bash
# Installer Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Ajouter le repo Traefik
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Installer Traefik
helm install traefik traefik/traefik \
  --namespace kube-system \
  --set service.type=LoadBalancer \
  --set ports.web.exposedPort=80 \
  --set ports.websecure.exposedPort=443
```

### 4. Récupérer le kubeconfig

```bash
# Sur la VM
sudo cat /etc/rancher/k3s/k3s.yaml

# Remplacer 127.0.0.1 par l'IP publique de la VM
# Puis copier le contenu sur votre machine locale dans ~/.kube/config
```

## Configuration GitHub

### 1. Secrets à configurer

Aller dans : **Settings → Secrets and variables → Actions**

| Secret                   | Description                               | Exemple                        |
| ------------------------ | ----------------------------------------- | ------------------------------ |
| `KUBE_CONFIG_STAGING`    | Kubeconfig encodé en base64               | `cat ~/.kube/config \| base64` |
| `KUBE_CONFIG_PRODUCTION` | Kubeconfig production (peut être le même) | `cat ~/.kube/config \| base64` |
| `JWT_SECRET`             | Secret JWT pour staging                   | `openssl rand -hex 32`         |
| `JWT_SECRET_PROD`        | Secret JWT pour production                | `openssl rand -hex 32`         |

### 2. Variables à configurer

Aller dans : **Settings → Secrets and variables → Actions → Variables**

| Variable            | Description           | Exemple                             |
| ------------------- | --------------------- | ----------------------------------- |
| `VITE_API_URL`      | URL de l'API          | `https://epitrello.example.com/api` |
| `PRODUCTION_DOMAIN` | Domaine de production | `epitrello.example.com`             |

### 3. Environnements

Créer deux environnements dans **Settings → Environments** :

1. **staging** - Déploiement automatique
2. **production** - Avec "Required reviewers" activé

## Déploiement Manuel (première fois)

```bash
# 1. Cloner le repo
git clone https://github.com/<owner>/epitrello.git
cd epitrello

# 2. Configurer kubectl
export KUBECONFIG=~/.kube/config

# 3. Créer le namespace
kubectl apply -f k8s/namespace.yaml

# 4. Créer les secrets manuellement
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<GITHUB_USER> \
  --docker-password=<GITHUB_TOKEN> \
  --namespace=epitrello

kubectl create secret generic backend-secrets \
  --from-literal=JWT_SECRET=<VOTRE_SECRET> \
  --from-literal=JWT_EXPIRES_IN=7d \
  --namespace=epitrello

# 5. Déployer avec Kustomize
kubectl apply -k k8s/

# 6. Vérifier
kubectl get all -n epitrello
```

## Commandes Utiles

```bash
# Voir tous les pods
kubectl get pods -n epitrello

# Logs du backend
kubectl logs -f deployment/backend -n epitrello

# Logs du frontend
kubectl logs -f deployment/frontend -n epitrello

# Logs MongoDB
kubectl logs -f statefulset/mongodb -n epitrello

# Redémarrer un déploiement
kubectl rollout restart deployment/backend -n epitrello

# Voir les événements
kubectl get events -n epitrello --sort-by='.lastTimestamp'

# Accéder à un pod
kubectl exec -it deployment/backend -n epitrello -- sh

# Port-forward pour debug local
kubectl port-forward svc/backend 5000:5000 -n epitrello
```

## Configurer un Domaine (Optionnel)

### Option A : Utiliser nip.io (gratuit, sans DNS)

Modifier `k8s/ingress.yaml` :

```yaml
rules:
  - host: epitrello.<IP-PUBLIQUE>.nip.io
```

### Option B : Configurer un vrai domaine

1. Acheter un domaine (Namecheap, Cloudflare, etc.)
2. Configurer un enregistrement A pointant vers l'IP publique
3. Modifier `k8s/ingress.yaml` avec votre domaine
4. Activer HTTPS avec cert-manager (voir ci-dessous)

### Installer cert-manager pour HTTPS

```bash
# Installer cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Créer un ClusterIssuer pour Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: votre@email.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
EOF
```

Puis décommenter les sections TLS dans `k8s/ingress.yaml`.

## Monitoring (Bonus)

### Installer le dashboard Kubernetes

```bash
# Déployer le dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Créer un token admin
kubectl create serviceaccount dashboard-admin -n kubernetes-dashboard
kubectl create clusterrolebinding dashboard-admin --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:dashboard-admin

# Récupérer le token
kubectl create token dashboard-admin -n kubernetes-dashboard

# Port-forward pour accéder
kubectl port-forward -n kubernetes-dashboard svc/kubernetes-dashboard 8443:443
```

## Troubleshooting

### Les pods sont en "Pending"

```bash
kubectl describe pod <POD_NAME> -n epitrello
# Vérifier les resources disponibles
kubectl describe nodes
```

### Les images ne se téléchargent pas

```bash
# Vérifier le secret GHCR
kubectl get secret ghcr-secret -n epitrello -o yaml
# Recréer si nécessaire
```

### MongoDB ne démarre pas

```bash
# Vérifier le PVC
kubectl get pvc -n epitrello
# Vérifier les logs
kubectl logs statefulset/mongodb -n epitrello
```

### L'Ingress ne fonctionne pas

```bash
# Vérifier Traefik
kubectl get pods -n kube-system | grep traefik
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```
