# Seraphims ML Models Integration

## Overview
Integrated ONNX machine learning models into the PXMonitor application for network analysis and prediction.

## Components Created

### 1. Backend Service (`backend/Seraphims/seraphims-service.js`)
Created a new service to handle ONNX model inference with three models:

#### Anomaly Detection Model
- **Features**: latency, jitter, bandwidth, packet_loss, dns_delay
- **Output**: -1 (anomaly) or 1 (normal)
- **Provides interpretation** of detected anomalies

#### Quality Prediction Model (Gradient Boosting)
- **Features**: latency, jitter, packet_loss, bandwidth
- **Output**: 0, 1, or 2 (mapped to 1080p, 480p, 720p)
- **Predicts streaming quality** based on network conditions

#### Network Bottleneck Model
- **Features**: latency, jitter, bandwidth, packet_loss, dns_delay, congestion_level_encoded
- **Output**: 'High', 'Moderate', or 'Low' (string type)
- **Detects network congestion** levels

### 2. API Endpoints (`backend/index.js`)
Added three new POST endpoints:

- **POST `/api/seraphims/anomaly`**
  - Body: `{ latency, jitter, bandwidth, packet_loss, dns_delay }`
  - Returns: `{ prediction, isAnomaly, interpretation }`

- **POST `/api/seraphims/quality`**
  - Body: `{ latency, jitter, packet_loss, bandwidth }`
  - Returns: `{ prediction, quality }`

- **POST `/api/seraphims/bottleneck`**
  - Body: `{ latency, jitter, bandwidth, packet_loss, dns_delay }`
  - Returns: `{ prediction, congestionLevel }`

### 3. Frontend Integration (`src/pages/SeraphimsPage.tsx`)
Enhanced the Seraphims page with:

- **Real-time metrics fetching** from the backend
- **"Run Model" buttons** for each ML model
- **Loading states** with spinner animations
- **Result display** with color-coded alerts:
  - Green for normal/good conditions
  - Orange for moderate issues
  - Red for critical/high issues
- **Error handling** with user-friendly messages
- **Toast notifications** for model execution results

## Features

### User Interface
- ✅ Three model cards with descriptions
- ✅ Run Model buttons for each model
- ✅ Real-time result display with visual feedback
- ✅ Loading indicators during model execution
- ✅ Error handling and display
- ✅ Toast notifications for completion/errors

### Backend
- ✅ ONNX model loading and inference
- ✅ Feature extraction and preprocessing
- ✅ Input validation
- ✅ Error handling and logging
- ✅ RESTful API endpoints

## Installation Steps

### Backend Dependencies
Navigate to the backend folder and install:
\`\`\`powershell
cd backend
npm install express cors body-parser onnxruntime-node
\`\`\`

Or if package.json doesn't exist, create it with the provided content and run:
\`\`\`powershell
npm install
\`\`\`

### Start the Backend
\`\`\`powershell
cd backend
node index.js
\`\`\`

Or use the existing start script:
\`\`\`powershell
./start-admin.bat
\`\`\`

## Usage

1. Navigate to the Seraphims page in the application
2. Wait for network metrics to load (fetched automatically every 5 seconds)
3. Click "Run Model" on any of the three model cards
4. View the results displayed in color-coded alerts
5. Results include:
   - Anomaly Detection: Shows if behavior is normal or anomalous with interpretation
   - Quality Prediction: Displays predicted streaming quality (1080p/720p/480p)
   - Bottleneck Detection: Shows congestion level (High/Moderate/Low)

## Model Details

### File Locations
- `backend/Seraphims/anomaly_model.onnx`
- `backend/Seraphims/gradient_boosting.onnx`
- `backend/Seraphims/network_bottleneck.onnx`

### Feature Requirements
Each model requires specific metrics from the network monitoring:
- **Latency**: Network delay in milliseconds
- **Jitter**: Variation in latency
- **Bandwidth**: Network throughput
- **Packet Loss**: Percentage of lost packets
- **DNS Delay**: DNS resolution time

## Error Handling

- Missing metrics: User notified to wait for data
- Model execution errors: Displayed in red alert boxes
- Network errors: Toast notifications with error details
- Invalid input: Backend validates and returns 400 status

## Future Enhancements

- [ ] Add model performance metrics
- [ ] Implement model result history
- [ ] Add export functionality for predictions
- [ ] Create visualization for model confidence
- [ ] Add batch prediction capability
- [ ] Implement model comparison feature
