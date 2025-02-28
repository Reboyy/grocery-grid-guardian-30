
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Receipt, Calendar, Settings, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

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

    // Fetch products for inventory display
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name");
        
        if (error) {
          toast({
            title: "Error fetching products",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (error) {
        console.error("Product fetch error:", error);
      }
    };

    fetchProducts();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  useEffect(() => {
    // Extract the page from location pathname
    const path = location.pathname.split('/').pop();
    if (path) {
      setActivePage(path);
    }
  }, [location]);

  // Filter products when search term changes
  useEffect(() => {
    if (products.length > 0) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

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
      path: "pos",
      roles: ["store_owner", "shopkeeper"]
    },
    {
      title: "Sales History",
      description: "View and print past sales",
      icon: <Receipt className="h-6 w-6" />,
      path: "sales",
      roles: ["store_owner", "shopkeeper"]
    },
    {
      title: "Shift Management",
      description: "Manage and close shifts",
      icon: <Calendar className="h-6 w-6" />,
      path: "shifts",
      roles: ["store_owner", "shopkeeper"]
    },
    {
      title: "Inventory Management",
      description: "Manage stock and products",
      icon: <Package className="h-6 w-6" />,
      path: "inventory",
      roles: ["store_owner", "warehouse_admin"]
    }
  ];

  const settingsFeature = {
    title: "Settings",
    path: "settings",
    roles: ["store_owner", "shopkeeper", "warehouse_admin"]
  };

  const navigateToPage = (path: string) => {
    navigate(`/${path}`);
  };

  const handleViewFullInventory = () => {
    navigate("/inventory");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 10).length;
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;

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
              onClick={() => navigateToPage(settingsFeature.path)}
            >
              <Settings className="h-8 w-8" />
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {operationalFeatures.map((feature) => (
          feature.roles.includes(userRole || '') && (
            <Card 
              key={feature.path}
              className="hover:bg-accent cursor-pointer transition-colors"
              onClick={() => navigateToPage(feature.path)}
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

      {/* Inventory Statistics Section - only shown if they also have inventory access */}
      {(userRole === "store_owner" || userRole === "warehouse_admin") && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Inventory Statistics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Products</CardTitle>
                <CardDescription>All inventory items</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalProducts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Low Stock</CardTitle>
                <CardDescription>Items with stock ≤ 10</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{lowStockProducts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Out of Stock</CardTitle>
                <CardDescription>Items with stock = 0</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{outOfStockProducts}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 5).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category || "—"}</TableCell>
                      <TableCell className="text-right">Rp{product.price.toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${product.stock_quantity <= 10 ? "text-orange-500" : ""} ${product.stock_quantity === 0 ? "text-red-500 font-bold" : ""}`}>
                        {product.stock_quantity}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredProducts.length > 5 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={handleViewFullInventory}>
                View All Products
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
