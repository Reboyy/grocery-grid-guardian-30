
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Package, Plus, Search, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
}

export default function Inventory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<string>("all");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    const fetchProducts = async () => {
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

      setProducts(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(product => product.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
      
      setLoading(false);
    };

    checkAuth();
    fetchProducts();
  }, [navigate, toast]);

  const handleStockFilter = (filter: string) => {
    setStockFilter(filter);
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === null || product.category === selectedCategory;
    
    // Stock filter
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = product.stock_quantity <= 10;
    } else if (stockFilter === "out") {
      matchesStock = product.stock_quantity === 0;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleAddProduct = () => {
    toast({
      title: "Feature coming soon",
      description: "Add product functionality will be implemented soon.",
    });
  };

  const handleEditProduct = (id: string) => {
    toast({
      title: "Feature coming soon",
      description: `Edit product ${id} functionality will be implemented soon.`,
    });
  };

  const handleDeleteProduct = (id: string) => {
    toast({
      title: "Feature coming soon",
      description: `Delete product ${id} functionality will be implemented soon.`,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 10).length;
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Package className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Inventory Management</h1>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" /> Add New Product
        </Button>
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

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={stockFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStockFilter("all")}
          >
            All
          </Button>
          <Button
            variant={stockFilter === "low" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStockFilter("low")}
          >
            Low Stock
          </Button>
          <Button
            variant={stockFilter === "out" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStockFilter("out")}
          >
            Out of Stock
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryFilter(null)}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryFilter(category)}
          >
            {category}
          </Button>
        ))}
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category || "—"}</TableCell>
                  <TableCell className="text-right">Rp{product.price.toFixed(2)}</TableCell>
                  <TableCell className={`text-right ${product.stock_quantity <= 10 ? "text-orange-500" : ""} ${product.stock_quantity === 0 ? "text-red-500 font-bold" : ""}`}>
                    {product.stock_quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditProduct(product.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
