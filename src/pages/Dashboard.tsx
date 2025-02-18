
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
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If there's an error during sign out, clear the session manually
        await supabase.auth.clearSession();
        console.error("Sign out error:", error);
        toast({
          title: "Sign out error",
          description: "You have been signed out, but there was an error. Please try logging in again.",
          variant: "destructive",
        });
      }
      // Always navigate to auth page, even if there was an error
      navigate("/auth");
    } catch (error: any) {
      console.error("Sign out error:", error);
      // If there's any other error, still try to clear the session and redirect
      await supabase.auth.clearSession();
      navigate("/auth");
      toast({
        title: "Sign out error",
        description: "There was a problem signing out. Please try logging in again.",
        variant: "destructive",
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
