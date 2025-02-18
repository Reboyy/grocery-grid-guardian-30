
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Receipt, Calendar, User, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Fetch user role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roles) {
        setUserRole(roles.role);
      }
      setLoading(false);
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
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      // We'll skip session check and just attempt to sign out
      await supabase.auth.signOut({
        scope: 'local'  // Only clear local session first
      });
      
      // Then try to clear globally, but don't wait for it
      supabase.auth.signOut({
        scope: 'global'
      }).catch((error) => {
        console.error("Global sign out error:", error);
        // We don't need to handle this error as we've already signed out locally
      });

      navigate("/auth");
    } catch (error: any) {
      console.error("Sign out error:", error);
      // Even if there's an error, redirect to auth
      navigate("/auth");
      toast({
        title: "Sign out notification",
        description: "You have been signed out. Please sign in again if needed.",
        variant: "default",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const features = [
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
    {
      title: "Settings",
      description: "Manage your profile and preferences",
      icon: <Settings className="h-6 w-6" />,
      path: "/settings",
      roles: ["store_owner", "shopkeeper", "warehouse_admin"] // Available to all roles
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userRole}</p>
        </div>
        <Button onClick={handleSignOut} variant="outline">
          <User className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
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
