# 🚀 Quick Start Guide

## The errors you're seeing mean the backend server is not running!

### **To Fix This:**

1. **Open a new terminal/command prompt**
2. **Navigate to your backend folder:**
   ```bash
   cd C:\Users\jagat\Downloads\PXMonitor-Real-time-Network-Monitoring-Diagnostic-Application\pxmonitor\backend
   ```

3. **Start the backend server:**
   ```bash
   ./start-admin.bat
   ```

   **OR manually:**
   ```bash
   node index.js
   ```

### **What Should Happen:**
You should see output like:
```
Backend server running on port 3001
Health check available at http://localhost:3001/health
Initializing AI Network Assistant Agents...
Configuration Manager initialized
Context Engine initialized successfully
AI Agent Manager initialized successfully
```

### **Once the backend is running:**
- ✅ The frontend errors will disappear
- ✅ The AI Agents page will work properly
- ✅ You'll see real-time notifications when agents work
- ✅ Manual agent execution will work

### **Common Issues:**
- **Port 3001 already in use**: Stop any other applications using port 3001
- **Node.js not found**: Make sure Node.js is installed and in your PATH
- **Permission errors**: Run command prompt as Administrator

### **Verification:**
Once the backend is running, you can test it by visiting:
- http://localhost:3001/health (should return server status)
- http://localhost:3001/api/agents/status (should return agent status)

The frontend will automatically connect and start working! 🎉