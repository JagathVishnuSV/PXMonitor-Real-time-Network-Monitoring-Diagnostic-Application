import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'config');
    this.defaultConfigPath = path.join(this.configPath, 'default.json');
    this.userConfigPath = path.join(this.configPath, 'user.json');
    this.config = null;
  }

  async initialize() {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configPath, { recursive: true });
      
      // Load configuration
      await this.loadConfig();
      
      console.log('Configuration Manager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Configuration Manager:', error);
      return false;
    }
  }

  async loadConfig() {
    try {
      // Load default configuration
      const defaultConfigData = await fs.readFile(this.defaultConfigPath, 'utf8');
      const defaultConfig = JSON.parse(defaultConfigData);

      // Try to load user configuration
      let userConfig = {};
      try {
        const userConfigData = await fs.readFile(this.userConfigPath, 'utf8');
        userConfig = JSON.parse(userConfigData);
      } catch (error) {
        // User config doesn't exist yet, that's fine
        console.log('No user configuration found, using defaults');
      }

      // Merge configurations (user overrides default)
      this.config = this.deepMerge(defaultConfig, userConfig);
      
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  async saveConfig(config) {
    try {
      // Save user configuration (only differences from default)
      const defaultConfig = await this.getDefaultConfig();
      const userConfig = this.getConfigDifferences(defaultConfig, config);
      
      await fs.writeFile(this.userConfigPath, JSON.stringify(userConfig, null, 2));
      
      // Update in-memory config
      this.config = config;
      
      console.log('Configuration saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }

  async getDefaultConfig() {
    try {
      const defaultConfigData = await fs.readFile(this.defaultConfigPath, 'utf8');
      return JSON.parse(defaultConfigData);
    } catch (error) {
      console.error('Error loading default configuration:', error);
      throw error;
    }
  }

  getConfig() {
    return this.config;
  }

  getAgentConfig(agentName) {
    return this.config?.agents?.[agentName] || {};
  }

  getAgentManagerConfig() {
    return this.config?.agentManager || {};
  }

  getContextEngineConfig() {
    return this.config?.contextEngine || {};
  }

  getActionExecutorConfig() {
    return this.config?.actionExecutor || {};
  }

  async updateAgentConfig(agentName, agentConfig) {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config.agents) {
      this.config.agents = {};
    }

    // Merge with existing agent config
    this.config.agents[agentName] = this.deepMerge(
      this.config.agents[agentName] || {},
      agentConfig
    );

    await this.saveConfig(this.config);
    return this.config.agents[agentName];
  }

  async updateAgentManagerConfig(managerConfig) {
    if (!this.config) {
      await this.loadConfig();
    }

    this.config.agentManager = this.deepMerge(
      this.config.agentManager || {},
      managerConfig
    );

    await this.saveConfig(this.config);
    return this.config.agentManager;
  }

  async resetToDefaults() {
    try {
      // Delete user config file
      try {
        await fs.unlink(this.userConfigPath);
      } catch (error) {
        // File might not exist, that's fine
      }

      // Reload configuration (will use defaults)
      await this.loadConfig();
      
      console.log('Configuration reset to defaults');
      return this.config;
    } catch (error) {
      console.error('Error resetting configuration:', error);
      throw error;
    }
  }

  async backupConfig() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.configPath, `backup-${timestamp}.json`);
      
      if (this.config) {
        await fs.writeFile(backupPath, JSON.stringify(this.config, null, 2));
        console.log(`Configuration backed up to: ${backupPath}`);
        return backupPath;
      }
      
      return null;
    } catch (error) {
      console.error('Error backing up configuration:', error);
      throw error;
    }
  }

  async validateConfig(config) {
    const errors = [];

    // Validate agent manager config
    if (config.agentManager) {
      if (config.agentManager.monitoring_interval < 1000) {
        errors.push('monitoring_interval must be at least 1000ms');
      }
      if (config.agentManager.max_concurrent_actions < 1) {
        errors.push('max_concurrent_actions must be at least 1');
      }
    }

    // Validate agent configurations
    if (config.agents) {
      for (const [agentName, agentConfig] of Object.entries(config.agents)) {
        if (agentConfig.cooldownPeriod && agentConfig.cooldownPeriod < 1000) {
          errors.push(`${agentName}: cooldownPeriod must be at least 1000ms`);
        }

        // Validate thresholds
        if (agentConfig.thresholds) {
          for (const [key, value] of Object.entries(agentConfig.thresholds)) {
            if (typeof value === 'object') {
              // Nested thresholds (like NetworkOptimization)
              for (const [subKey, subValue] of Object.entries(value)) {
                if (typeof subValue !== 'number' || subValue < 0) {
                  errors.push(`${agentName}: ${key}.${subKey} must be a positive number`);
                }
              }
            } else if (typeof value !== 'number' || value < 0) {
              errors.push(`${agentName}: ${key} must be a positive number`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getConfigDifferences(defaultConfig, currentConfig) {
    const differences = {};
    
    for (const key in currentConfig) {
      if (typeof currentConfig[key] === 'object' && !Array.isArray(currentConfig[key])) {
        const nestedDiff = this.getConfigDifferences(
          defaultConfig[key] || {},
          currentConfig[key]
        );
        if (Object.keys(nestedDiff).length > 0) {
          differences[key] = nestedDiff;
        }
      } else if (currentConfig[key] !== defaultConfig[key]) {
        differences[key] = currentConfig[key];
      }
    }
    
    return differences;
  }

  async exportConfig() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportPath = path.join(this.configPath, `export-${timestamp}.json`);
      
      if (this.config) {
        await fs.writeFile(exportPath, JSON.stringify(this.config, null, 2));
        console.log(`Configuration exported to: ${exportPath}`);
        return exportPath;
      }
      
      return null;
    } catch (error) {
      console.error('Error exporting configuration:', error);
      throw error;
    }
  }

  async importConfig(configPath) {
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const importedConfig = JSON.parse(configData);
      
      // Validate imported configuration
      const validation = await this.validateConfig(importedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      // Backup current configuration
      await this.backupConfig();
      
      // Save imported configuration
      await this.saveConfig(importedConfig);
      
      console.log(`Configuration imported from: ${configPath}`);
      return this.config;
    } catch (error) {
      console.error('Error importing configuration:', error);
      throw error;
    }
  }

  getConfigSummary() {
    if (!this.config) {
      return null;
    }

    const summary = {
      agentManager: {
        enabled: true,
        monitoring_interval: this.config.agentManager?.monitoring_interval || 30000,
        max_concurrent_actions: this.config.agentManager?.max_concurrent_actions || 3
      },
      agents: {}
    };

    if (this.config.agents) {
      for (const [agentName, agentConfig] of Object.entries(this.config.agents)) {
        summary.agents[agentName] = {
          enabled: agentConfig.enabled || false,
          cooldownPeriod: agentConfig.cooldownPeriod || 60000,
          hasThresholds: !!agentConfig.thresholds,
          hasRules: !!agentConfig.rules
        };
      }
    }

    return summary;
  }
}