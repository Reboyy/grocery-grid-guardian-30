import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Receipt, Calendar, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session error:", error);
        navigate("/auth");
        return;
      }

      if (!session) {
        navigate("/auth");
        return;
      }
      
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (roles) {
          setUserRole(roles.role);
        }
      } catch (error) {
        console.error("Role fetch error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user role",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSignOut = async () => {
    try {
      // First try local signout
      await supabase.auth.signOut({ scope: 'local' });
      
      // Attempt global signout but don't block
      supabase.auth.signOut({ scope: 'global' })
        .catch(error => console.error("Global sign out error:", error));
      
      navigate("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
      navigate("/auth");
      toast({
        title: "Sign out notification",
        description: "You have been signed out. Please sign in again if needed.",
        variant: "default",
      });
    }
  };

  const operationalFeatures = [
    {
      title: "Point of Sale",
      description: "Process sales and transactions",
      icon: <ShoppingCart className="h-6 w-6" />,
      path: "/pos",
      roles: ["store_owner", "shopkeeper"]
    },
    {
      title: "Inventory Management",
      description: "Manage products and stock",
      icon: <DollarSign className="h-6 w-6" />,
      path: "/inventory",
      roles: ["store_owner", "warehouse_admin"]
    },
    {
      title: "Sales History",
      description: "View and print past sales",
      icon: <Receipt className="h-6 w-6" />,
      path: "/sales",
      roles: ["store_owner", "shopkeeper"]
    },
    {
      title: "Shift Management",
      description: "Manage and close shifts",
      icon: <Calendar className="h-6 w-6" />,
      path: "/shifts",
      roles: ["store_owner", "shopkeeper"]
    },
  ];

  const settingsFeature = {
    title: "Settings",
    path: "/settings",
    roles: ["store_owner", "shopkeeper", "warehouse_admin"]
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userRole}</p>
        </div>
        <div className="flex items-center gap-4">
          {settingsFeature.roles.includes(userRole || '') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => navigate(settingsFeature.path)}
            >
              <Settings className="h-8 w-8" />
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {operationalFeatures.map((feature) => (
          feature.roles.includes(userRole || '') && (
            <Card 
              key={feature.path}
              className="hover:bg-accent cursor-pointer transition-colors"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  {feature.icon}
                  <div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        ))}
      </div>
    </div>
  );
}
