# PXMonitor: Advanced Network Intelligence & Management Platform

## Technical Documentation

PXMonitor is an enterprise-grade, full-stack network monitoring and diagnostic platform that combines real-time performance tracking, advanced AI-powered analytics, and intelligent visualization tools. Built with modern web technologies (React, TypeScript, Node.js), this comprehensive solution provides network administrators and IT professionals with a unified interface to monitor, diagnose, troubleshoot, and predict network behavior across complex infrastructures.

---

##  Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Core Components & Pages](#core-components--pages)
- [API Endpoints](#api-endpoints)
- [Machine Learning Models](#machine-learning-models)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)

---

##  Architecture Overview

PXMonitor follows a modern client-server architecture:

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API + Local State
- **Routing**: React Router v6
- **UI Components**: Shadcn/ui component library
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

### Backend (Node.js + Express)
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Network Monitoring**: TShark (Wireshark CLI) integration
- **AI/ML**: ONNX Runtime for model inference
- **AI Services**: Google Gemini API integration
- **Process Monitoring**: Native Windows PowerShell integration

---

##  Technology Stack

### Frontend Dependencies
- **React**: UI framework
- **TypeScript**: Type safety and better developer experience
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Charting library for metrics visualization
- **Lucide React**: Icon library
- **React Router**: Client-side routing
- **Sonner**: Toast notifications

### Backend Dependencies
- **Express**: Web server framework
- **CORS**: Cross-origin resource sharing
- **Body-parser**: Request body parsing
- **onnxruntime-node**: ONNX model inference
- **Child Process**: System command execution

---

##  Core Components & Pages

### 1. **Dashboard** (/dashboard)

**Purpose**: Centralized real-time network monitoring and visualization hub.

**Key Features**:
- Real-time metrics display with 5-second refresh intervals
- Network Health Score (0-100) calculated from multiple factors
- Interactive multi-line charts for latency, jitter, and bandwidth trends
- Protocol distribution visualization (HTTP, HTTPS, DNS, etc.)
- Top applications bandwidth consumption analysis
- Network stability and congestion status indicators
- Alert banner system for critical issues
- Stale data detection and warnings

**Endpoints Used**:
- GET /metrics - Fetches current network metrics
- POST /api/gemini/analyze-network - AI-powered network analysis
- POST /api/gemini/explain-component - Component-specific explanations

**Data Flow**:
1. Dashboard polls /metrics endpoint every 5 seconds
2. Validates and parses incoming data with robust error handling
3. Updates chart data arrays (maintains last 20 data points)
4. Calculates health score based on weighted metrics
5. Triggers alerts if thresholds are exceeded
6. Stores historical data for trend analysis

**Technical Implementation**:
- Uses useEffect hook for metric polling with cleanup
- Implements exponential backoff for error recovery
- Maintains separate state for each metric category
- Utilizes memoization for expensive calculations
- Implements connection status tracking (connecting/connected/error/no-data)

---

### 2. **Diagnosis** (/diagnosis)

**Purpose**: Automated network troubleshooting and remediation toolkit.

**Key Features**:
- One-click network diagnostic script execution
- Before/after metric comparison
- Real-time script execution status
- Progress indicators for long-running operations
- Detailed error reporting and logging
- AI-powered issue analysis and recommendations

**Available Diagnostic Scripts**:
1. **Flush DNS Cache** (Flush-DnsCache.ps1)
   - Clears DNS resolver cache
   - Fixes DNS resolution issues
   
2. **Reset Network IP** (Reset-NetworkIP.ps1)
   - Releases and renews IP configuration
   - Resolves DHCP-related problems
   
3. **Optimize Bandwidth** (Optimize-Bandwidth.ps1)
   - Terminates bandwidth-heavy background processes
   - Improves available bandwidth
   
4. **Switch DNS Server** (Switch-DnsServer.ps1)
   - Changes DNS server configuration
   - Switches between ISP and public DNS (Google, Cloudflare)
   
5. **Reconnect WiFi** (Reconnect-WiFi.ps1)
   - Disconnects and reconnects WiFi adapter
   - Fixes wireless connectivity issues
   
6. **Clear Network Congestion** (Clear-NetworkCongestion.ps1)
   - Terminates high-bandwidth applications
   - Frees up network resources
   
7. **Maintain Powerful Connection** (Maintain-PowerfulConnection.ps1)
   - Optimizes network adapter settings
   - Enhances connection stability

**Endpoints Used**:
- GET /metrics - Captures baseline metrics
- POST /api/run-script/:scriptName - Executes PowerShell scripts
- GET /api/diagnostics/ping-test - Latency testing
- GET /api/diagnostics/dns-test - DNS resolution testing

**Technical Implementation**:
- Captures "before" metrics prior to script execution
- Executes PowerShell scripts with elevated privileges via start-admin.bat
- Implements script validation whitelist for security
- Captures script output (stdout/stderr)
- Measures execution time
- Captures "after" metrics for comparison
- Displays percentage improvements

---

### 3. **Connection Mapper** (/connection-mapper)

**Purpose**: Visual network topology and connection analysis.

**Key Features**:
- Interactive force-directed graph visualization
- Real-time connection tracking
- IP address and port mapping
- Protocol identification
- Connection state monitoring (established, time_wait, etc.)
- Bandwidth usage per connection
- Security analysis integration

**Endpoints Used**:
- GET /api/connections/mapped - Retrieves connection topology data
- POST /api/analyze-connections-security - AI security analysis
- POST /api/explain-hostname - Hostname/IP explanation

**Data Structure**:
`	ypescript
interface Connection {
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  state: string;
  process_name: string;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
}
`

**Visualization Features**:
- Node clustering by process
- Edge thickness indicates bandwidth usage
- Color coding for connection states
- Interactive node selection and filtering
- Zoom and pan capabilities

---

### 4. **System Monitor** (/system-monitor)

**Purpose**: System-level resource monitoring and process management.

**Key Features**:
- Real-time CPU, memory, and disk usage tracking
- Process-level resource consumption
- Battery impact analysis
- Suspicious activity detection
- System health aggregation
- Process termination capabilities

**Endpoints Used**:
- GET /api/system/processes - All running processes with resource usage
- GET /api/system/battery - Battery impact assessment
- GET /api/system/suspicious - Suspicious process detection
- GET /api/system/health - Overall system health metrics
- POST /api/system/analyze - AI-powered system analysis

**Monitoring Metrics**:
- **CPU**: Per-process CPU usage percentage
- **Memory**: Working set, private bytes, virtual memory
- **Disk I/O**: Read/write operations and throughput
- **Network**: Sent/received bytes per process
- **Battery**: Power consumption estimates

---

### 5. **Seraphims** (/seraphims)

**Purpose**: AI-powered predictive network analytics using ONNX machine learning models.

**Key Features**:
- Three specialized ML models for network prediction
- Real-time inference on current metrics
- Visual result display with color-coded alerts
- Model execution status tracking
- Comprehensive model documentation

**Machine Learning Models**:

#### **A. Anomaly Detection Model**
- **Algorithm**: Isolation Forest
- **Input Features**: [latency, jitter, bandwidth, packet_loss, dns_delay]
- **Output**: Binary classification (-1 = Anomaly, 1 = Normal)
- **Purpose**: Identifies unusual network behavior patterns
- **Endpoint**: POST /api/seraphims/anomaly

**Request Format**:
`json
{
  "latency": 45.5,
  "jitter": 12.3,
  "bandwidth": 85.2,
  "packet_loss": 1.5,
  "dns_delay": 15.8
}
`

**Response Format**:
`json
{
  "prediction": -1,
  "isAnomaly": true,
  "features": [45.5, 12.3, 85.2, 1.5, 15.8],
  "interpretation": "Network delay detected — latency spike observed"
}
`

#### **B. Quality Prediction Model (Gradient Boosting)**
- **Algorithm**: Gradient Boosting Classifier
- **Input Features**: [latency, jitter, packet_loss, bandwidth]
- **Output**: Multi-class (0=1080p, 1=480p, 2=720p)
- **Purpose**: Predicts achievable streaming quality
- **Endpoint**: POST /api/seraphims/quality

**Request Format**:
`json
{
  "latency": 30.2,
  "jitter": 8.5,
  "packet_loss": 0.5,
  "bandwidth": 95.0
}
`

**Response Format**:
`json
{
  "prediction": 0,
  "quality": "1080p",
  "features": [30.2, 8.5, 0.5, 95.0]
}
`

#### **C. Network Bottleneck Detection Model**
- **Algorithm**: Neural Network Classifier
- **Input Features**: [latency, jitter, bandwidth, packet_loss, dns_delay, congestion_level_encoded]
- **Output**: String classification (High/Moderate/Low)
- **Purpose**: Identifies network congestion levels
- **Endpoint**: POST /api/seraphims/bottleneck

**Request Format**:
`json
{
  "latency": 120.5,
  "jitter": 45.2,
  "bandwidth": 25.0,
  "packet_loss": 5.5,
  "dns_delay": 85.3
}
`

**Response Format**:
`json
{
  "prediction": "High",
  "rawPrediction": 2.0,
  "features": [120.5, 45.2, 25.0, 5.5, 85.3, 2],
  "congestionLevel": "High"
}
`

**Technical Implementation**:
- Uses ONNX Runtime for cross-platform model inference
- Implements lazy loading for optimal memory usage
- Handles BigInt serialization for Node.js compatibility
- Provides fallback mechanisms for unsupported output types
- Includes comprehensive error handling and logging

---

### 6. **System Mode** (/system-mode)

**Purpose**: Operational profile management and configuration presets.

**Key Features**:
- Predefined monitoring profiles
- Custom threshold configurations
- Mode-specific alert rules
- Automated mode switching based on time/conditions
- Profile import/export functionality

---

### 7. **Settings** (/settings)

**Purpose**: Application configuration and preference management.

**Key Features**:
- Dark/Light theme toggle
- Notification preferences
- Alert threshold customization
- Data retention policies
- Settings export to CSV
- LocalStorage persistence

**Settings Categories**:

1. **General Settings**:
   - Dark Mode: Toggle theme
   - Start with System: Auto-launch configuration
   - Show Notifications: Alert display preferences

2. **Alert Thresholds**:
   - Latency Threshold: 50-300ms range
   - Packet Loss Threshold: 0-10% range
   - Low Bandwidth Threshold: 10-90% range

**Endpoints Used**:
- Settings are stored in browser LocalStorage
- exportSettingsToCSV() utility function for CSV export

---

##  API Endpoints

### Network Metrics Endpoints

#### GET /metrics
**Purpose**: Retrieves current network performance metrics
**Response**:
`json
{
  "latency": 45.5,
  "jitter": 12.3,
  "bandwidth": 85.2,
  "packet_loss": 1.5,
  "dns_delay": 15.8,
  "health_score": 87,
  "stability": "stable",
  "congestion": "stable",
  "protocolData": [...],
  "topAppsData": [...],
  "timestamp": 1697234567890,
  "packetsReceived": 1500
}
`

#### POST /api/set-interface
**Purpose**: Changes the network interface being monitored
**Request**:
`json
{
  "interface": "Wi-Fi"
}
`

#### GET /api/current-interface
**Purpose**: Returns the currently monitored network interface

---

### Diagnostic Script Endpoints

#### POST /api/run-script/:scriptName
**Purpose**: Executes a PowerShell diagnostic script
**Parameters**: scriptName (validated against whitelist)
**Response**:
`json
{
  "output": "DNS cache cleared successfully",
  "exitCode": 0,
  "executionTime": 1250
}
`

#### GET /api/diagnostics/ping-test
**Purpose**: Performs latency test to 8.8.8.8
**Response**:
`json
{
  "latency": 25
}
`

#### GET /api/diagnostics/dns-test
**Purpose**: Measures DNS resolution time
**Response**:
`json
{
  "responseTime": 15
}
`

---

### System Monitoring Endpoints

#### GET /api/system/processes
**Purpose**: Returns all running processes with resource usage
**Response**: Array of process objects

#### GET /api/system/battery
**Purpose**: Battery impact analysis
**Response**: Battery consumption data

#### GET /api/system/suspicious
**Purpose**: Identifies potentially malicious processes
**Response**: Array of suspicious processes

#### GET /api/system/health
**Purpose**: Overall system health metrics
**Response**: Aggregated health data

---

### Connection Mapping Endpoints

#### GET /api/connections/mapped
**Purpose**: Network topology and connection data
**Response**: Graph structure with nodes and edges

#### POST /api/analyze-connections-security
**Purpose**: AI security analysis of connections
**Request**: Connection data array
**Response**: Security assessment and recommendations

---

### AI/Gemini Service Endpoints

#### POST /api/gemini/analyze-network
**Purpose**: Comprehensive network analysis using AI
**Request**: Current metrics object
**Response**: Natural language analysis and recommendations

#### POST /api/gemini/explain-component
**Purpose**: Component-specific explanations
**Request**: Component name and data
**Response**: Plain English explanation

#### POST /api/system/analyze
**Purpose**: AI-powered system analysis
**Request**: System context and question
**Response**: AI-generated answer

---

### Seraphims ML Model Endpoints

#### POST /api/seraphims/anomaly
**Purpose**: Anomaly detection inference
**Request**: 5 network features
**Response**: Binary classification with interpretation

#### POST /api/seraphims/quality
**Purpose**: Streaming quality prediction
**Request**: 4 network features
**Response**: Quality level (1080p/720p/480p)

#### POST /api/seraphims/bottleneck
**Purpose**: Congestion level detection
**Request**: 5 network features
**Response**: Congestion level (High/Moderate/Low)

---

##  Installation & Setup

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Npcap**: Network packet capture library ([Download](https://npcap.com/))
- **TShark**: Command-line network protocol analyzer
- **Windows OS**: Required for PowerShell scripts
- **Google Gemini API Key**: For AI features

### Installation Steps

1. **Clone Repository**:
`ash
git clone https://github.com/devanathandna/PXMonitor-Real-time-Network-Monitoring-Diagnostic-Application
cd pxmonitor
`

2. **Install Frontend Dependencies**:
`ash
npm install
`

3. **Install Backend Dependencies**:
`ash
cd backend
npm install onnxruntime-node express cors body-parser
cd ..
`

4. **Configure API Keys**:
Create/edit the following files with your Gemini API key:
- src/services/gemini-service.ts
- ackend/services/gemini-service.js

`	ypescript
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
`

5. **Verify ONNX Models**:
Ensure these files exist in ackend/Seraphims/:
- nomaly_model.onnx
- gradient_boosting.onnx
- 
etwork_bottleneck.onnx

### Running the Application

**Terminal 1 - Backend Server**:
`ash
cd backend
./start-admin.bat
# OR
node index.js
`

**Terminal 2 - Frontend Dev Server**:
`ash
npm run dev
`

Access the application at http://localhost:5173 (or the port shown in terminal).

---

##  Configuration

### Environment Variables
Create .env file in project root:
`env
VITE_BACKEND_URL=http://localhost:3001
VITE_GEMINI_API_KEY=your_api_key_here
`

### Backend Configuration
Edit ackend/index.js for:
- Port configuration (default: 3001)
- CORS origins
- TShark executable path
- Script directory paths

### Frontend Configuration
Edit src/services/gemini-service.ts:
- API endpoint URLs
- Polling intervals
- Chart data retention limits
- Alert thresholds

---

##  Usage Guide

### Monitoring Network Health
1. Navigate to Dashboard
2. Observe real-time health score and metrics
3. Check protocol distribution and top applications
4. Review historical trends in charts
5. Use AI analysis for detailed insights

### Running Diagnostics
1. Go to Diagnosis page
2. View current baseline metrics
3. Select appropriate diagnostic script
4. Click "Run" and wait for execution
5. Compare before/after metrics
6. Repeat if necessary

### Using ML Models
1. Navigate to Seraphims page
2. Wait for metrics to load (updates every 5 seconds)
3. Click "Run Model" on desired prediction type
4. View color-coded results
5. Interpret AI recommendations

### Exporting Data
1. Click "Export Data" button in sidebar
2. CSV file downloads automatically
3. Contains current snapshot of all metrics
4. Filename includes timestamp for tracking

---

##  Security Considerations

- PowerShell scripts are whitelisted to prevent arbitrary execution
- Elevated privileges required for some diagnostic operations
- API endpoints validate input data
- CORS configured for specific origins only
- No sensitive data stored in browser LocalStorage
- ONNX models run in sandboxed environment

---

##  Troubleshooting

### Backend Won't Start
- Verify Node.js installation
- Check port 3001 availability
- Ensure onnxruntime-node is installed
- Verify ONNX model files exist

### Frontend Connection Errors
- Confirm backend is running
- Check CORS configuration
- Verify API endpoint URLs
- Inspect browser console for errors

### TShark Not Capturing
- Install Npcap with WinPcap compatibility
- Run backend with administrator privileges
- Verify network interface name
- Check Windows Firewall settings

### Models Not Loading
- Verify ONNX model file paths
- Check file permissions
- Ensure onnxruntime-node installed correctly
- Review backend console for error logs

---

##  License

This project is licensed under the MIT License.

##  Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

##  Contact

For issues and questions, please open an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Maintained by**: PXMonitor Development Team
