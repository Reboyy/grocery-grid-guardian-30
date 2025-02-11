
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Printer, Receipt, Calendar, User } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
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
    await supabase.auth.signOut();
    navigate("/auth");
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
