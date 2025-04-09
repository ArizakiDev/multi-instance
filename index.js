// multi-instance/index.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Table = require('cli-table3');
const figures = require('figures');

class MultiInstanceManager {
  constructor(options = {}) {
    this.instances = new Map();
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.defaultEnv = options.env || {};
    
    // Création du dossier de logs s'il n'existe pas
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Démarre une nouvelle instance
   * @param {string} id - Identifiant unique pour l'instance
   * @param {string} filePath - Chemin vers le fichier JavaScript à exécuter
   * @param {Object} options - Options supplémentaires
   * @returns {Object} - Informations sur l'instance créée
   */
  start(id, filePath, options = {}) {
    if (this.instances.has(id)) {
      throw new Error(`${chalk.red('✖')} Une instance avec l'ID "${id}" existe déjà`);
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`${chalk.red('✖')} Le fichier "${filePath}" n'existe pas`);
    }

    const env = { ...this.defaultEnv, ...options.env };
    const args = options.args || [];
    const logFile = options.logFile || path.join(this.logDir, `${id}.log`);
    
    // Création du stream de log
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Démarrage du processus
    const proc = spawn('node', [resolvedPath, ...args], { 
      env: { ...process.env, ...env },
      detached: options.detached || false
    });

    // Gestion des logs
    proc.stdout.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const output = `[${timestamp}] [${id}] ${data}`;
      logStream.write(output);
      
      if (options.silent !== true) {
        console.log(chalk.cyan(`${figures.pointer} [${id}]`), data.toString().trim());
      }
    });

    proc.stderr.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const output = `[${timestamp}] [${id}] [ERROR] ${data}`;
      logStream.write(output);
      
      if (options.silent !== true) {
        console.error(chalk.red(`${figures.cross} [${id}]`), data.toString().trim());
      }
    });

    // Gestion de la fin du processus
    proc.on('close', (code) => {
      const exitMessage = `[${new Date().toISOString()}] [${id}] Process exited with code ${code}`;
      logStream.write(exitMessage + '\n');
      logStream.end();
      
      if (options.silent !== true) {
        const exitIcon = code === 0 ? chalk.green(figures.tick) : chalk.red(figures.cross);
        console.log(`${exitIcon} [${id}] Processus terminé avec le code ${code}`);
      }
      
      this.instances.delete(id);
    });

    // Stockage des informations sur l'instance
    const instance = {
      id,
      filePath: resolvedPath,
      process: proc,
      pid: proc.pid,
      logFile,
      startTime: new Date(),
      options
    };
    
    this.instances.set(id, instance);
    
    if (options.silent !== true) {
      console.log(chalk.green(`${figures.tick} Instance "${id}" démarrée (PID: ${proc.pid})`));
    }
    
    return instance;
  }

  /**
   * Arrête une instance en cours d'exécution
   * @param {string} id - Identifiant de l'instance à arrêter
   * @param {Object} options - Options d'arrêt
   * @returns {boolean} - true si l'instance a été arrêtée, false sinon
   */
  stop(id, options = {}) {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    const { force = false, silent = false } = options;
    
    if (force) {
      process.kill(instance.pid, 'SIGKILL');
    } else {
      process.kill(instance.pid, 'SIGTERM');
    }
    
    if (!silent) {
      console.log(chalk.yellow(`${figures.info} Arrêt de l'instance "${id}" (PID: ${instance.pid})`));
    }
    
    return true;
  }

  /**
   * Arrête toutes les instances en cours d'exécution
   * @param {Object} options - Options d'arrêt
   * @returns {number} - Nombre d'instances arrêtées
   */
  stopAll(options = {}) {
    let count = 0;
    for (const id of this.instances.keys()) {
      if (this.stop(id, options)) {
        count++;
      }
    }
    
    if (!options.silent) {
      console.log(chalk.yellow(`${figures.info} ${count} instance(s) arrêtée(s)`));
    }
    
    return count;
  }

  /**
   * Redémarre une instance
   * @param {string} id - Identifiant de l'instance à redémarrer
   * @param {Object} options - Options de redémarrage
   * @returns {Object} - Informations sur la nouvelle instance
   */
  restart(id, options = {}) {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`${chalk.red('✖')} Aucune instance avec l'ID "${id}" n'a été trouvée`);
    }

    const { filePath, options: originalOptions } = instance;
    const newOptions = { ...originalOptions, ...options };
    
    this.stop(id, { silent: newOptions.silent });
    
    // Attendre un peu pour s'assurer que le processus est terminé
    return new Promise(resolve => {
      setTimeout(() => {
        const newInstance = this.start(id, filePath, newOptions);
        resolve(newInstance);
      }, 1000);
    });
  }

  /**
   * Liste toutes les instances en cours d'exécution
   * @param {boolean} formatted - Si true, retourne une table formatée pour la console
   * @returns {Array|string} - Liste des instances ou table formatée
   */
  list(formatted = false) {
    if (this.instances.size === 0) {
      return formatted ? chalk.yellow(`${figures.warning} Aucune instance en cours d'exécution`) : [];
    }

    const instanceList = [...this.instances.values()].map(inst => {
      const uptime = Math.floor((new Date() - inst.startTime) / 1000);
      return {
        id: inst.id,
        pid: inst.pid,
        file: path.basename(inst.filePath),
        uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
        logFile: path.basename(inst.logFile)
      };
    });

    if (!formatted) {
      return instanceList;
    }

    // Création d'une table formatée pour l'affichage console
    const table = new Table({
      head: [
        chalk.cyan('ID'), 
        chalk.cyan('PID'), 
        chalk.cyan('Fichier'), 
        chalk.cyan('Uptime'), 
        chalk.cyan('Logs')
      ],
      style: {
        head: [],
        border: []
      }
    });

    instanceList.forEach(inst => {
      table.push([
        chalk.green(inst.id),
        inst.pid,
        inst.file,
        inst.uptime,
        inst.logFile
      ]);
    });

    return `${figures.pointer} ${this.instances.size} instance(s) en cours d'exécution:\n` + table.toString();
  }

  /**
   * Retourne les détails d'une instance spécifique
   * @param {string} id - Identifiant de l'instance
   * @returns {Object|null} - Informations sur l'instance ou null si non trouvée
   */
  get(id) {
    const instance = this.instances.get(id);
    if (!instance) {
      return null;
    }

    // Calculer l'uptime
    const uptime = Math.floor((new Date() - instance.startTime) / 1000);
    
    return {
      ...instance,
      uptime: {
        seconds: uptime,
        formatted: `${Math.floor(uptime / 60)}m ${uptime % 60}s`
      }
    };
  }

  /**
   * Envoie un signal à une instance spécifique
   * @param {string} id - Identifiant de l'instance
   * @param {string} signal - Signal à envoyer (ex: 'SIGTERM', 'SIGINT')
   * @returns {boolean} - true si le signal a été envoyé, false sinon
   */
  sendSignal(id, signal) {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    try {
      process.kill(instance.pid, signal);
      console.log(chalk.blue(`${figures.info} Signal ${signal} envoyé à l'instance "${id}" (PID: ${instance.pid})`));
      return true;
    } catch (err) {
      console.error(chalk.red(`${figures.cross} Erreur lors de l'envoi du signal ${signal} à l'instance "${id}": ${err.message}`));
      return false;
    }
  }

  /**
   * Retrouver les logs d'une instance
   * @param {string} id - Identifiant de l'instance
   * @param {Object} options - Options de lecture des logs
   * @returns {string|null} - Contenu des logs ou null si fichier non trouvé
   */
  getLogs(id, options = {}) {
    const instance = this.instances.get(id);
    const logFile = instance ? instance.logFile : path.join(this.logDir, `${id}.log`);
    
    if (!fs.existsSync(logFile)) {
      return null;
    }

    const { tail = 0, head = 0 } = options;
    let content = fs.readFileSync(logFile, 'utf8');
    
    if (tail > 0) {
      const lines = content.split('\n');
      content = lines.slice(Math.max(lines.length - tail, 0)).join('\n');
    }
    
    if (head > 0) {
      const lines = content.split('\n');
      content = lines.slice(0, head).join('\n');
    }
    
    return content;
  }
}

module.exports = MultiInstanceManager;