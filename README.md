# PXMonitor: Take Control of Your Home Network

Ever wonder why your video call is stuttering, your game is lagging, or a webpage is taking forever to load? Is it the Wi-Fi? Is someone else hogging the bandwidth? PXMonitor is a user-friendly application that answers these questions for you. It acts like a co-pilot for your network, giving you a clear, simple view of what’s happening and helping you fix common problems with a single click.

PXMonitor demystifies your network. It translates confusing technical data into straightforward insights, so you can stop guessing and start solving.

---

## 🤔 Why Use PXMonitor?

In today's connected world, a slow or unreliable network can be a major source of frustration. PXMonitor is designed for anyone who wants to understand and improve their connection without needing a degree in computer science.

-   **Stop the Blame Game:** Finally figure out if it's your computer, the Wi-Fi, or your internet provider causing the slowdown.
-   **Pinpoint Bandwidth Hogs:** Discover which apps or devices are secretly eating up your bandwidth in the background.
-   **Improve Your Experience:** Enjoy smoother gaming, clearer video calls, and faster streaming by identifying and fixing the root cause of network issues.
-   **Empower Yourself:** Gain the confidence to solve common network problems on your own, without waiting for tech support.

---

## ✨ Features for Everyone

#### **📊 Your Network's "Health Check" at a Glance**
Think of this as a speedometer for your internet. Our live dashboard gives you a simple **Network Health Score** from 1-100. You can instantly see if your connection is running smoothly or struggling. It also shows you easy-to-understand gauges for **Speed**, **Stability**, and **Lag**.

#### **🔬 See What's Using Your Internet**
-   **What's Running?:** A simple chart shows you what types of activity are happening on your network right now (like web browsing, video streaming, or online gaming).
-   **Who's Using the Most?:** Quickly identify the top applications on your computer that are using the most internet, so you can close them if needed.

#### **🤖 Your Personal AI Network Assistant**
-   **"Explain This to Me":** Don't understand a chart? Click the "Analyze" button, and our built-in AI will give you a plain-English explanation of what the data means for you.
-   **Get a Full Report:** Ask the AI for a complete "health report" of your network. It will look at everything and give you a summary with practical advice on how to improve your connection.

#### **🛠️ One-Click Fix-It Toolkit**
Our Diagnosis page lets you test for common problems and, more importantly, fix them instantly.
-   **Is your internet feeling sluggish?** Try the **Flush DNS Cache** button to clear out old data.
-   **Wi-Fi acting up?** The **Reconnect Wi-Fi** button will quickly reset your connection.
-   **Too many things running?** The **Optimize Bandwidth** tool helps shut down background apps that are slowing you down.

Each time you use a fix, the app shows you the "before and after" results, so you can see that it worked!

---

## 🚀 Getting Started (The Technical Bit)

For those comfortable with a bit of setup, here’s how to get PXMonitor running on your computer.

### Prerequisites

- **Node.js**: A runtime for JavaScript.
- **Npcap**: A tool that lets PXMonitor see network traffic. You'll need to install this from the [official Npcap website](https://npcap.com/).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/devanathandna/PXMonitor-Real-time-Network-Monitoring-Diagnostic-Application
    cd pxmonitor
    ```

2.  **Install dependencies for both frontend and backend:**
    ```bash
    # Install the main app's components
    npm install

    # Install the backend server's components
    cd backend
    npm install
    cd ..
    ```

3.  **Add your Google Gemini API Key:**
    The AI features require a key from Google. You'll need to add gemini_model key to two files:
    

    In both files, find the line `const API_KEY = "YOUR_API_KEY";` and paste your key inside the quotes.

4.  **Run the Application:**
    You'll need to open two command-line terminals.

    - **Terminal 1: Start the Backend**
      ```bash
      cd backend
      node index.js
      ```

    - **Terminal 2: Start the Main App**
      ```bash
      npm run dev
      ```
      Now, you can open your web browser and navigate to the address shown in the terminal to use PXMonitor!

