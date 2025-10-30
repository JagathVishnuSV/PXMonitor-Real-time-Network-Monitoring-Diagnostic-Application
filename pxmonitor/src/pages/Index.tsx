import { useState } from "react";
import { Button } from "@/components/ui/button";
import AgentDashboard from "@/components/dashboard/AgentDashboard";
import AgentStatusDebug from "@/components/dashboard/AgentStatusDebug";

const Index = () => {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">AI Network Assistant</h1>
            <p className="text-muted-foreground">
              Monitor and manage your intelligent network optimization agents
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </div>
      </div>
      
      {showDebug ? <AgentStatusDebug /> : <AgentDashboard />}
    </div>
  );
};

export default Index;
