
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
import { 
  Package, 
  Plus, 
  Search, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  X 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
}

interface NewProduct {
  sku: string;
  name: string;
  description: string;
  price: number | string;
  stock_quantity: number | string;
  category: string;
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
  
  // Add product state
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    sku: "",
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setNewProduct({
      sku: "",
      name: "",
      description: "",
      price: "",
      stock_quantity: "",
      category: "",
    });
    setAddProductOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProduct({
      ...newProduct,
      [name]: value,
    });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Convert string values to numbers where needed
      const productToSubmit = {
        ...newProduct,
        price: Number(newProduct.price),
        stock_quantity: Number(newProduct.stock_quantity),
      };

      // Validate required fields
      if (!productToSubmit.sku || !productToSubmit.name || productToSubmit.price <= 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields correctly.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if SKU already exists
      const { data: existingSku } = await supabase
        .from('products')
        .select('sku')
        .eq('sku', productToSubmit.sku)
        .single();

      if (existingSku) {
        toast({
          title: "Duplicate SKU",
          description: "This SKU already exists. Please use a unique SKU.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Insert the new product
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            sku: productToSubmit.sku,
            name: productToSubmit.name,
            description: productToSubmit.description || null,
            price: productToSubmit.price,
            stock_quantity: productToSubmit.stock_quantity || 0,
            category: productToSubmit.category || null,
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      // Add the new product to the state
      if (data && data.length > 0) {
        setProducts([...products, data[0]]);
        
        // Update categories if needed
        if (productToSubmit.category && !categories.includes(productToSubmit.category)) {
          setCategories([...categories, productToSubmit.category]);
        }
      }

      toast({
        title: "Product Added",
        description: `${productToSubmit.name} has been added to inventory.`,
      });

      // Close the dialog
      setAddProductOpen(false);
    } catch (error: any) {
      toast({
        title: "Error Adding Product",
        description: error.message || "An error occurred while adding the product.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new product to your inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-right">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    name="sku"
                    placeholder="Product SKU"
                    value={newProduct.sku}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-right">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name" 
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Product description"
                  value={newProduct.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-right">
                    Price (Rp) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={newProduct.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity" className="text-right">
                    Stock Quantity
                  </Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    value={newProduct.stock_quantity}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category
                </Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="Product Category"
                  value={newProduct.category}
                  onChange={handleInputChange}
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map((category, index) => (
                    <option key={index} value={category} />
                  ))}
                </datalist>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
