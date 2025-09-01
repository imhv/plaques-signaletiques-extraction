# 🏷️ Plaques Signalétiques Extraction

Système d'extraction automatique d'informations à partir de plaques signalétiques d'appareils électroménagers utilisant la vision artificielle LLM.

## 🏗️ Installation et Configuration

### Installation

```bash
# Cloner le projet
git clone https://github.com/imhv/plaques-signaletiques-extraction.git
cd plaques-signaletiques-extraction

# Installer les dépendances
pnpm install

# Configuration
cp .env.example .env.local
# Éditer .env.local avec vos clés
```

### Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### Démarrage

```bash
# Développement
pnpm dev

# Production
pnpm build
pnpm start

```

## Guide d'utilisation

### Créer un compte

-> localhost:3000/signup
-> vérifier votre email

### (page /) Vérifier via upload

1. Uploadez une image de plaque signalétique
2. Consultez les résultats extraits

### (page /extractions) Liste de vos uploads avec les résultats

1. Consultez l'historique de vos extractions
2. Visualisez les images et données extraites
3. Exportez les résultats si nécessaire

### (page /test-zone) Lancer des tests automatisés aléatoires sur la base des 100 plaques communiquées

1. Donnez un nom à votre test
2. Définissez le nombre d'images à tester
3. Réglez le nombre par batch lors des exécutions
   -> Visualisez chaque test avec résultat attendu et résultats obtenus
   -> Statistiques globales de réussite

## 🛠️ Technologies Choisies et Justifications

Tests réalisés :

- OCR seule : non concluant
- OCR / LLM : résultats mitigés
- Préformatage image / LLM : amélioration limitée
- LLM seul : meilleure performance

### **1. Vision LLM (GPT-4o-mini)**

- **Pourquoi** : Performance supérieure à l'OCR traditionnel
- **Avantages** :
  - Compréhension contextuelle des plaques signalétiques
  - Gestion multilingue native (FR, EN, ES, IT)
  - Extraction directe sans étape intermédiaire OCR
- **Coût** : Optimisé avec GPT-4o-mini pour équilibrer performance/coût

### **2. AI SDK (Vercel)**

- **Pourquoi** : SDK optimisé pour les modèles LLM
- **Avantages** :
  - Gestion automatique des rate limits
  - Retry logic intégré
  - Streaming et structured outputs

### **3. Stack Supabase (Backend as a Service)**

- **Pourquoi** : Solution centralisée et rapide à mettre en place
- **Composants** :
  - **Storage S3** : Stockage des fichiers images dans le cloud AWS via Supabase
  - **Authentication** : Gestion complète des utilisateurs (inscription, connexion, sessions)
  - **Base de données** : Tables `images` et `predictions` pour stocker les résultats avec ORM intégré
- **Avantages** :
  - **Centralisation** : Tout le backend en une seule plateforme
  - **Rapidité** : Mise en place très rapide sans configuration complexe
  - **Scalabilité** : Infrastructure AWS sous-jacente
  - **Sécurité** : RLS (Row Level Security) intégré
  - **API automatique** : Endpoints REST générés automatiquement (ORM)

## 🔄 Pipeline d'Extraction

### Étapes du Pipeline

1. **Upload d'Image** → Supabase Storage (S3 AWS)
2. **Génération URL Signée** → Accès sécurisé à l'image
3. **Extraction LLM** → GPT-4o-mini avec prompt spécialisé
4. **Post-traitement** → Normalisation et validation
5. **Sauvegarde** → Tables Supabase (`images` + `predictions`)

### Architecture Modulaire

```

lib/extraction/
├── pipeline.ts # Orchestrateur principal
├── llm-extractor.ts # Extraction par vision LLM
├── image-preprocessor.ts # Prétraitement (désactivé)
├── extraction-OCR.ts # avant LLM (désactivé)

```

- **TypeScript** : Type safety complète

### Gestion des Rate Limits

- **Rate Limiter** : 450 RPM, 180k TPM
- **Retry Logic** : Exponential backoff
- **Monitoring** : Logs détaillés des performances

## 📊 Performance et Robustesse

### Métriques de Performance

- **Temps de traitement** : ~15 secondes par image (dépend du modèle choisi et des serveurs du LLM)
- **Taux de succès attendu** : > 85% des lisibles
- **Gestion d'erreurs** : Retry automatique + fallbacks

## ⚠️ Limites Connues et Hypothèses

### Limites Techniques

1. **Qualité d'image** : Performance dégradée sur images floues/illisibles
2. **Rate limits API** : 450 RPM maximum (géré automatiquement)
3. **Taille d'image** : Limite 1MB pour les uploads (peut être largement augmentée avec une version payante)

### Cas d'Échec Identifiés

- Images très floues ou mal éclairées
- Plaques partiellement masquées
- Textes manuscrits ou très stylisés

## 🚀 Pistes d'Amélioration

### Améliorations Techniques (Court terme)

1. **Prétraitement d'images** : Intégration Sharp pour améliorer la netteté (pas de résultat concluant avec peu de temps consacré)
   1 bis. **API de retraitement** : Services API externes payants pour améliorer les images
2. **Base de connaissances** : DB de marques/modèles pour validation amélioré
3. **Multi-modèles** : Test d'autres modèles vision (Claude, Gemini)
4. **Prompting** : Meilleur résultat grâce à un meilleur prompt (connaissance et retour terrain principalement)
5. **Scaling** : Fine-tuning de modèles Hugging Face avec un grand dataset (nécessite usage et moyens)
6. **Interface utilisateur** : Amélioration globale de l'UI/UX (peu d'effort consacré sur cette partie)

### Améliorations Produit (Moyen terme)

1. **Validation manuelle** : Workflow de correction des erreurs
2. **Suite des fonctionnalités de l'app** : recommandations, historique détaillé, export de données...
