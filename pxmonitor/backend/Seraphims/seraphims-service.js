import * as ort from 'onnxruntime-node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Seraphims] __dirname resolved to:', __dirname);

// Model paths - normalize for Windows
const ANOMALY_MODEL_PATH = path.resolve(__dirname, 'anomaly_model.onnx');
const GRADIENT_BOOSTING_MODEL_PATH = path.resolve(__dirname, 'gradient_boosting.onnx');
const NETWORK_BOTTLENECK_MODEL_PATH = path.resolve(__dirname, 'network_bottleneck.onnx');

console.log('[Seraphims] Model paths:');
console.log('[Seraphims] - Anomaly:', ANOMALY_MODEL_PATH);
console.log('[Seraphims] - Gradient:', GRADIENT_BOOSTING_MODEL_PATH);
console.log('[Seraphims] - Bottleneck:', NETWORK_BOTTLENECK_MODEL_PATH);

// Verify files exist
console.log('[Seraphims] Checking if model files exist:');
console.log('[Seraphims] - Anomaly exists:', fs.existsSync(ANOMALY_MODEL_PATH));
console.log('[Seraphims] - Gradient exists:', fs.existsSync(GRADIENT_BOOSTING_MODEL_PATH));
console.log('[Seraphims] - Bottleneck exists:', fs.existsSync(NETWORK_BOTTLENECK_MODEL_PATH));

// Feature definitions for each model
const ANOMALY_FEATURE_COLUMNS = ['latency', 'jitter', 'bandwidth', 'packet_loss', 'dns_delay'];
const GRADIENT_FEATURES = ['latency', 'jitter', 'packet_loss', 'bandwidth'];
const BOTTLENECK_FEATURES = ['latency', 'jitter', 'bandwidth', 'packet_loss', 'dns_delay', 'congestion_level_encoded'];

// Congestion mapping
const CONGESTION_MAPPING = { 'High': 2, 'Moderate': 1, 'Low': 0 };
const CONGESTION_REVERSE_MAPPING = { 2: 'High', 1: 'Moderate', 0: 'Low' };

// Quality mapping for gradient boosting
const QUALITY_MAPPING = { 0: '1080p', 1: '480p', 2: '720p' };

// Load models (lazy loading)
let anomalySession = null;
let gradientSession = null;
let bottleneckSession = null;

/**
 * Load the anomaly detection model
 */
async function loadAnomalyModel() {
    if (!anomalySession) {
        console.log('[Seraphims] Loading anomaly detection model...');
        anomalySession = await ort.InferenceSession.create(ANOMALY_MODEL_PATH);
        console.log('[Seraphims] Anomaly model loaded successfully');
        console.log('[Seraphims] Input names:', anomalySession.inputNames);
        console.log('[Seraphims] Output names:', anomalySession.outputNames);
    }
    return anomalySession;
}

/**
 * Load the gradient boosting model
 */
async function loadGradientBoostingModel() {
    if (!gradientSession) {
        console.log('[Seraphims] Loading gradient boosting model...');
        gradientSession = await ort.InferenceSession.create(GRADIENT_BOOSTING_MODEL_PATH);
        console.log('[Seraphims] Gradient boosting model loaded successfully');
        console.log('[Seraphims] Input names:', gradientSession.inputNames);
        console.log('[Seraphims] Output names:', gradientSession.outputNames);
    }
    return gradientSession;
}

/**
 * Load the network bottleneck model
 */
async function loadNetworkBottleneckModel() {
    if (!bottleneckSession) {
        console.log('[Seraphims] Loading network bottleneck model...');
        bottleneckSession = await ort.InferenceSession.create(NETWORK_BOTTLENECK_MODEL_PATH);
        console.log('[Seraphims] Network bottleneck model loaded successfully');
        console.log('[Seraphims] Input names:', bottleneckSession.inputNames);
        console.log('[Seraphims] Output names:', bottleneckSession.outputNames);
    }
    return bottleneckSession;
}

/**
 * Run anomaly detection model
 * Returns -1 for anomaly, 1 for normal
 */
export async function runAnomalyDetection(metrics) {
    try {
        const session = await loadAnomalyModel();
        
        // Extract features in the correct order
        const features = ANOMALY_FEATURE_COLUMNS.map(col => parseFloat(metrics[col]) || 0);
        
        // Create input tensor (1 sample, n features)
        const inputTensor = new ort.Tensor('float32', features, [1, features.length]);
        
        // Run inference - use the actual input name from the model
        const inputName = session.inputNames[0];
        const outputName = session.outputNames[0];
        const feeds = { [inputName]: inputTensor };
        
        console.log('[Seraphims] Running inference with input:', inputName);
        const results = await session.run(feeds);
        
        // Get output
        const outputData = results[outputName].data;
        const rawPrediction = outputData[0];
        
        // Convert BigInt to Number if needed
        const prediction = typeof rawPrediction === 'bigint' ? Number(rawPrediction) : rawPrediction;
        
        console.log('[Seraphims] Anomaly detection result:', prediction);
        
        return {
            prediction: prediction, // -1 or 1
            isAnomaly: prediction === -1,
            features: features,
            interpretation: getAnomalyInterpretation(prediction, metrics)
        };
    } catch (error) {
        console.error('[Seraphims] Error running anomaly detection:', error);
        throw error;
    }
}

/**
 * Run gradient boosting quality prediction model
 * Returns 0, 1, or 2 (mapped to quality levels)
 */
export async function runQualityPrediction(metrics) {
    try {
        const session = await loadGradientBoostingModel();
        
        // Extract features in the correct order
        const features = GRADIENT_FEATURES.map(col => parseFloat(metrics[col]) || 0);
        
        // Create input tensor (1 sample, n features)
        const inputTensor = new ort.Tensor('float32', features, [1, features.length]);
        
        // Run inference - use the actual input name from the model
        const inputName = session.inputNames[0];
        const feeds = { [inputName]: inputTensor };
        
        // Only request the label output, not the probability map
        const outputNames = ['output_label'];
        
        console.log('[Seraphims] Running inference with input:', inputName);
        console.log('[Seraphims] Requesting outputs:', outputNames);
        const results = await session.run(feeds, outputNames);
        
        console.log('[Seraphims] Available output keys:', Object.keys(results));
        
        // Get output - try different output names
        let prediction;
        
        // Try to get the label output (usually the first output or named 'output_label')
        if (results['output_label']) {
            const outputData = results['output_label'].data;
            const rawPrediction = outputData[0];
            prediction = typeof rawPrediction === 'bigint' ? Number(rawPrediction) : rawPrediction;
        } else {
            // Fallback: get the first available output
            const firstOutputKey = Object.keys(results)[0];
            const outputData = results[firstOutputKey].data;
            const rawPrediction = outputData[0];
            prediction = typeof rawPrediction === 'bigint' ? Number(rawPrediction) : rawPrediction;
        }
        
        console.log('[Seraphims] Quality prediction result:', prediction);
        
        return {
            prediction: prediction, // 0, 1, or 2
            quality: QUALITY_MAPPING[prediction] || 'Unknown',
            features: features
        };
    } catch (error) {
        console.error('[Seraphims] Error running quality prediction:', error);
        throw error;
    }
}

/**
 * Run network bottleneck detection model
 * Returns string type: 'High', 'Moderate', or 'Low'
 */
export async function runBottleneckDetection(metrics) {
    try {
        const session = await loadNetworkBottleneckModel();
        
        // Calculate congestion level encoded value
        const congestionLevel = calculateCongestionLevel(metrics);
        const congestionEncoded = CONGESTION_MAPPING[congestionLevel];
        
        // Extract features in the correct order
        const features = BOTTLENECK_FEATURES.map(col => {
            if (col === 'congestion_level_encoded') {
                return congestionEncoded;
            }
            return parseFloat(metrics[col]) || 0;
        });
        
        // Create input tensor (1 sample, n features)
        const inputTensor = new ort.Tensor('float32', features, [1, features.length]);
        
        // Run inference - use the actual input name from the model
        const inputName = session.inputNames[0];
        const feeds = { [inputName]: inputTensor };
        
        console.log('[Seraphims] Running inference with input:', inputName);
        console.log('[Seraphims] Available output names:', session.outputNames);
        
        // Try to run with only the label output if there are multiple outputs
        let results;
        if (session.outputNames.length > 1) {
            // Only request the first output (usually the label)
            results = await session.run(feeds, [session.outputNames[0]]);
        } else {
            results = await session.run(feeds);
        }
        
        console.log('[Seraphims] Available output keys:', Object.keys(results));
        
        // Get output
        const outputName = Object.keys(results)[0];
        const outputData = results[outputName].data;
        const rawPrediction = outputData[0];
        
        // Convert BigInt to Number if needed
        const prediction = typeof rawPrediction === 'bigint' ? Number(rawPrediction) : rawPrediction;
        
        // Map back to string
        const bottleneckLevel = CONGESTION_REVERSE_MAPPING[Math.round(prediction)] || 'Unknown';
        
        console.log('[Seraphims] Bottleneck detection result:', bottleneckLevel);
        
        return {
            prediction: bottleneckLevel, // 'High', 'Moderate', 'Low'
            rawPrediction: prediction,
            features: features,
            congestionLevel: congestionLevel
        };
    } catch (error) {
        console.error('[Seraphims] Error running bottleneck detection:', error);
        throw error;
    }
}

/**
 * Helper function to calculate congestion level from metrics
 */
function calculateCongestionLevel(metrics) {
    const latency = parseFloat(metrics.latency) || 0;
    const packetLoss = parseFloat(metrics.packetLoss) || 0;
    const jitter = parseFloat(metrics.jitter) || 0;
    
    // Simple heuristic to determine congestion level
    if (latency > 150 || packetLoss > 5 || jitter > 50) {
        return 'High';
    } else if (latency > 80 || packetLoss > 2 || jitter > 25) {
        return 'Moderate';
    }
    return 'Low';
}

/**
 * Get human-readable interpretation for anomaly detection
 */
function getAnomalyInterpretation(prediction, metrics) {
    if (prediction === 1) {
        return 'Normal behavior - No anomalies detected';
    }
    
    // Anomaly detected - provide specific reason
    const issues = [];
    const latency = parseFloat(metrics.latency) || 0;
    const jitter = parseFloat(metrics.jitter) || 0;
    const packetLoss = parseFloat(metrics.packetLoss) || 0;
    
    if (latency > 100) {
        issues.push('Network delay detected — latency spike observed');
    }
    if (jitter > 30) {
        issues.push('Unstable connection — jitter values are inconsistent');
    }
    if (packetLoss > 3) {
        issues.push('Possible packet drop issue — check your router or connection stability');
    }
    
    return issues.length > 0 ? issues.join('. ') : 'Anomaly detected - Network behavior is unusual';
}
