# 🚀 Multi-Instance Manager

Un gestionnaire d'instances JavaScript élégant avec une interface riche en emojis pour démarrer, arrêter et contrôler plusieurs processus Node.js.

## ✨ Caractéristiques

- 🔄 Démarrage et gestion de plusieurs instances JavaScript simultanément
- 📊 Interface console colorée avec emojis pour une meilleure lisibilité
- 📝 Journalisation automatique de la sortie de chaque instance
- 🔍 Surveillance facile de l'état des instances
- ⏱️ Redémarrage automatique des instances
- 🔧 API simple mais puissante pour l'intégration dans vos scripts

## 📦 Installation

```bash
npm install multi-instance
```

## 🛠️ Utilisation

### Exemple basique

```javascript
const MultiInstanceManager = require('multi-instance');

// Créer une nouvelle instance du gestionnaire
const manager = new MultiInstanceManager();

// Démarrer une nouvelle instance
manager.start('server', './server.js');

// Démarrer une autre instance avec des arguments
manager.start('worker', './worker.js', { 
  args: ['--mode=processing'],
  env: { WORKER_ID: '1' }
});

// Lister toutes les instances en cours d'exécution
console.log(manager.list(true));

// Arrêter une instance spécifique
manager.stop('worker');

// Redémarrer une instance
manager.restart('server');

// Arrêter toutes les instances
manager.stopAll();
```

### Options avancées

```javascript
// Créer un gestionnaire avec un dossier de logs personnalisé
const manager = new MultiInstanceManager({
  logDir: './custom-logs',
  env: { NODE_ENV: 'production' } // Variables d'environnement par défaut
});

// Démarrer une instance avec des options avancées
manager.start('api', './api.js', {
  args: ['--port=3000'],
  env: { 
    API_KEY: 'secret-key',
    DEBUG: 'api:*'
  },
  silent: false,   // Afficher les logs dans la console
  detached: true,  // Exécuter en mode détaché
  logFile: './logs/api-custom.log'  // Chemin personnalisé pour le fichier de log
});

// Obtenir les logs d'une instance
const logs = manager.getLogs('api', { tail: 100 });
console.log(logs);

// Envoyer un signal personnalisé à une instance
manager.sendSignal('api', 'SIGUSR2');
```

## 📖 API

### Création du gestionnaire

```javascript
const manager = new MultiInstanceManager(options);
```

#### Options:
- `logDir`: Dossier où les logs seront stockés (par défaut: `./logs`)
- `env`: Variables d'environnement par défaut pour toutes les instances

### Méthodes

#### `start(id, filePath, options)`
Démarre une nouvelle instance.

- `id`: Identifiant unique pour l'instance
- `filePath`: Chemin vers le fichier JavaScript à exécuter
- `options`: 
  - `args`: Arguments de ligne de commande (tableau)
  - `env`: Variables d'environnement
  - `silent`: Ne pas afficher les logs dans la console
  - `detached`: Exécuter en mode détaché
  - `logFile`: Chemin personnalisé pour le fichier de log

#### `stop(id, options)`
Arrête une instance en cours d'exécution.

- `id`: Identifiant de l'instance
- `options`:
  - `force`: Utiliser SIGKILL au lieu de SIGTERM
  - `silent`: Ne pas afficher de message lors de l'arrêt

#### `stopAll(options)`
Arrête toutes les instances en cours d'exécution.

#### `restart(id, options)`
Redémarre une instance.

#### `list(formatted)`
Liste toutes les instances en cours d'exécution.

- `formatted`: Si `true`, retourne une table formatée pour la console

#### `get(id)`
Retourne les détails d'une instance spécifique.

#### `sendSignal(id, signal)`
Envoie un signal à une instance spécifique.

#### `getLogs(id, options)`
Récupère les logs d'une instance.

- `options`:
  - `tail`: Nombre de lignes à récupérer depuis la fin
  - `head`: Nombre de lignes à récupérer depuis le début

## 📝 Exemple d'utilisation en CLI

Vous pouvez créer un script CLI pour gérer vos instances:

```javascript
#!/usr/bin/env node
const MultiInstanceManager = require('multi-instance');
const manager = new MultiInstanceManager();

const command = process.argv[2];
const id = process.argv[3];
const filePath = process.argv[4];

switch (command) {
  case 'start':
    manager.start(id, filePath);
    break;
    
  case 'stop':
    manager.stop(id);
    break;
    
  case 'list':
    console.log(manager.list(true));
    break;
    
  case 'logs':
    console.log(manager.getLogs(id, { tail: 20 }));
    break;
    
  default:
    console.log('Commandes disponibles: start, stop, list, logs');
}
```
