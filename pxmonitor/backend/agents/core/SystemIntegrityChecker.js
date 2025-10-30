import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SystemIntegrityChecker {
  constructor() {
    this.basePath = path.join(__dirname, '..');
    this.checks = [];
    this.results = [];
  }

  async runAllChecks() {
    console.log('🔍 Running System Integrity Checks...\n');

    // Core Components Check
    await this.checkCoreComponents();
    
    // Configuration System Check
    await this.checkConfigurationSystem();
    
    // Agent Components Check
    await this.checkAgentComponents();
    
    // PowerShell Scripts Check
    await this.checkPowerShellScripts();
    
    // ONNX Models Check
    await this.checkONNXModels();
    
    // Frontend Components Check
    await this.checkFrontendComponents();

    // Generate Report
    this.generateReport();
    
    return this.results;
  }

  async checkCoreComponents() {
    console.log('📋 Checking Core Components...');
    
    const coreFiles = [
      'core/AgentManager.js',
      'core/ContextEngine.js',
      'core/ActionExecutor.js',
      'core/ConfigManager.js'
    ];

    for (const file of coreFiles) {
      const filePath = path.join(this.basePath, 'agents', file);
      const exists = await this.checkFileExists(filePath);
      this.addResult('Core Components', file, exists);
    }
  }

  async checkConfigurationSystem() {
    console.log('⚙️ Checking Configuration System...');
    
    const configPath = path.join(this.basePath, 'agents', 'config');
    const configDirExists = await this.checkDirectoryExists(configPath);
    this.addResult('Configuration', 'config directory', configDirExists);

    const defaultConfigPath = path.join(configPath, 'default.json');
    const defaultConfigExists = await this.checkFileExists(defaultConfigPath);
    this.addResult('Configuration', 'default.json', defaultConfigExists);

    if (defaultConfigExists) {
      try {
        const configContent = await fs.readFile(defaultConfigPath, 'utf8');
        const config = JSON.parse(configContent);
        const hasAgentManager = !!config.agentManager;
        const hasAgents = !!config.agents;
        this.addResult('Configuration', 'valid JSON structure', hasAgentManager && hasAgents);
      } catch (error) {
        this.addResult('Configuration', 'JSON validation', false, error.message);
      }
    }
  }

  async checkAgentComponents() {
    console.log('🤖 Checking Agent Components...');
    
    const agentFiles = [
      'specialized/TrafficPrioritizationAgent.js',
      'specialized/NetworkOptimizationAgent.js',
      'specialized/SecurityMonitoringAgent.js',
      'specialized/PerformanceAnalyticsAgent.js',
      'ml/MLPredictiveAgent.js'
    ];

    for (const file of agentFiles) {
      const filePath = path.join(this.basePath, 'agents', file);
      const exists = await this.checkFileExists(filePath);
      this.addResult('Agent Components', file, exists);
    }
  }

  async checkPowerShellScripts() {
    console.log('📜 Checking PowerShell Scripts...');
    
    const scriptFiles = [
      'Clear-NetworkCongestion.ps1',
      'Flush-DnsCache.ps1',
      'Maintain-PowerfulConnection.ps1',
      'Optimize-Bandwidth.ps1',
      'Reconnect-WiFi.ps1',
      'Reset-NetworkIP.ps1',
      'StableConnection.ps1',
      'Switch-DnsServer.ps1'
    ];

    for (const file of scriptFiles) {
      const filePath = path.join(this.basePath, 'scripts', file);
      const exists = await this.checkFileExists(filePath);
      this.addResult('PowerShell Scripts', file, exists);
    }
  }

  async checkONNXModels() {
    console.log('🧠 Checking ONNX Models...');
    
    const modelFiles = [
      'anomaly_model.onnx',
      'gradient_boosting.onnx',
      'network_bottleneck.onnx'
    ];

    for (const file of modelFiles) {
      const filePath = path.join(this.basePath, 'Seraphims', file);
      const exists = await this.checkFileExists(filePath);
      this.addResult('ONNX Models', file, exists);
    }

    const seraphimsService = path.join(this.basePath, 'Seraphims', 'seraphims-service.js');
    const serviceExists = await this.checkFileExists(seraphimsService);
    this.addResult('ONNX Models', 'seraphims-service.js', serviceExists);
  }

  async checkFrontendComponents() {
    console.log('🖥️ Checking Frontend Components...');
    
    const frontendPath = path.join(this.basePath, '..', 'src', 'components', 'dashboard');
    
    const componentFiles = [
      'AgentDashboard.tsx',
      'MLInsightsPanel.tsx',
      'AgentConfigPanel.tsx',
      'SecurityPanel.tsx'
    ];

    for (const file of componentFiles) {
      const filePath = path.join(frontendPath, file);
      const exists = await this.checkFileExists(filePath);
      this.addResult('Frontend Components', file, exists);
    }
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async checkDirectoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  addResult(category, item, success, error = null) {
    this.results.push({
      category,
      item,
      success,
      error
    });
  }

  generateReport() {
    console.log('\n📊 System Integrity Report');
    console.log('=' * 50);
    
    const categories = [...new Set(this.results.map(r => r.category))];
    let totalChecks = 0;
    let passedChecks = 0;

    for (const category of categories) {
      console.log(`\n${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${result.item}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
        totalChecks++;
        if (result.success) passedChecks++;
      }
    }

    console.log('\n' + '=' * 50);
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${totalChecks - passedChecks}`);
    console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 All checks passed! System is ready for deployment.');
    } else {
      console.log('\n⚠️ Some checks failed. Please review the issues above.');
    }

    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      successRate: (passedChecks / totalChecks) * 100,
      allPassed: passedChecks === totalChecks
    };
  }

  async generateHealthReport() {
    const results = await this.runAllChecks();
    const timestamp = new Date().toISOString();
    
    const report = {
      timestamp,
      systemHealth: results,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.basePath, 'agents', 'system-health-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Health report saved to: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedResults = this.results.filter(r => !r.success);

    if (failedResults.length === 0) {
      recommendations.push('System is in excellent condition. No action required.');
      return recommendations;
    }

    const categories = [...new Set(failedResults.map(r => r.category))];

    for (const category of categories) {
      switch (category) {
        case 'Core Components':
          recommendations.push('Core components are missing. Please ensure all core files are properly installed.');
          break;
        case 'Configuration':
          recommendations.push('Configuration system needs attention. Check config directory and default.json file.');
          break;
        case 'Agent Components':
          recommendations.push('Some agents are missing. This may reduce system functionality.');
          break;
        case 'PowerShell Scripts':
          recommendations.push('PowerShell scripts are missing. Network optimization features may be limited.');
          break;
        case 'ONNX Models':
          recommendations.push('ML models are missing. Predictive capabilities will be disabled.');
          break;
        case 'Frontend Components':
          recommendations.push('Frontend components are missing. Dashboard functionality may be limited.');
          break;
      }
    }

    return recommendations;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new SystemIntegrityChecker();
  checker.generateHealthReport().catch(console.error);
}