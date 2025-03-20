
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Grocery Grid Guardian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Manage your grocery store efficiently with our comprehensive management system.
          </p>
          
          <div className="grid gap-2">
            <Button 
              className="w-full" 
              onClick={() => navigate("/auth")}
            >
              Login / Sign Up
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/dashboard")}
            >
              View Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
