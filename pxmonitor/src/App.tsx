import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Layout from "./components/layout/Layout";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationToast from "./components/ui/NotificationToast";
import ConnectionStatus from "./components/ui/ConnectionStatus";
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Diagnosis from "./pages/Diagnosis";
import SystemMode from "./pages/SystemMode";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SystemMonitor from "./pages/SystemMonitor";
import ConnectionMapperPage from "./pages/ConnectionMapperPage";
import SeraphimsPage from "./pages/SeraphimsPage";
import Index from "./pages/Index";


const queryClient = new QueryClient();

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if there's a saved preference
    const savedSettings = localStorage.getItem('pxmonitor-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        const darkModeSetting = settings
          .find((group: any) => group.id === "general")
          ?.settings.find((setting: any) => setting.id === "theme")?.value;
        
        // If a setting exists, use it, otherwise default to dark mode
        return darkModeSetting !== undefined ? darkModeSetting : true;
      } catch (error) {
        console.error("Error loading theme settings:", error);
        return true; // Default to dark mode on error
      }
    }
    return true; // Default to dark mode if no settings found
  });

  // Apply theme based on settings
  useEffect(() => {
    // Add event listener for settings updates
    const handleSettingsUpdate = (event: any) => {
      const { darkMode } = event.detail;
      if (darkMode !== undefined) {
        setIsDarkMode(darkMode);
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    
    // Initial theme application
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Add Montserrat font to improve typography
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Save current theme to localStorage directly to ensure persistence
    const savedSettings = localStorage.getItem('pxmonitor-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        const generalGroup = settings.find((group: any) => group.id === "general");
        if (generalGroup) {
          const themeSetting = generalGroup.settings.find((setting: any) => setting.id === "theme");
          if (themeSetting) {
            themeSetting.value = isDarkMode;
            localStorage.setItem('pxmonitor-settings', JSON.stringify(settings));
          }
        }
      } catch (error) {
        console.error("Error updating theme in settings:", error);
      }
    }
    
    return () => {
      document.head.removeChild(link);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, [isDarkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <NotificationToast />
          <ConnectionStatus />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/welcome" element={<Welcome />} />
            
            {/* Layout wrapped routes */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/diagnosis" element={<Layout><Diagnosis /></Layout>} />
            <Route path="/system-mode" element={<Layout><SystemMode /></Layout>} />
            <Route path="/connection-mapper" element={<Layout><ConnectionMapperPage /></Layout>} />            
            <Route path="/system-monitor" element={<Layout><SystemMonitor /></Layout>} />
            <Route 
              path="/seraphims" 
              element={<Layout><SeraphimsPage /></Layout>} 
            />
            <Route path="/agents" element={<Layout><Index /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
