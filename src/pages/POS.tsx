import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingCart, Plus, Minus, Printer, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  Harga: number;
  sku: string;
  stock_quantity: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

export default function POS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cashierName, setCashierName] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setCashierName(profile.full_name || session.user.email || "");
      }
    };

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      
      if (error) {
        toast({
          title: "Error mengambil produk",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setProducts(data);
      const uniqueCategories = [...new Set(data.map(product => product.category))];
      setCategories(uniqueCategories.filter(Boolean) as string[]);
      setLoading(false);
    };

    checkAuth();
    fetchProducts();
  }, [navigate, toast]);

  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * product.Harga }
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1, subtotal: product.Harga }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(currentCart =>
      currentCart.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity, subtotal: newQuantity * item.Harga };
        }
        return item;
      })
    );
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Anda harus login untuk menyelesaikan penjualan",
          variant: "destructive",
        });
        return;
      }

      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          cashier_id: user.id,
          total_amount: total,
          payment_method: "cash",
          status: "completed"
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.Harga,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Penjualan selesai",
        description: "Transaksi berhasil dicatat.",
      });

      printReceipt();

      setCart([]);
    } catch (error: any) {
      toast({
        title: "Error menyelesaikan penjualan",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '', 'width=300,height=600');
    if (!printWindow) return;

    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 300px;
              padding: 10px;
              margin: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .total {
              font-weight: bold;
              margin-top: 10px;
            }
            @media print {
              body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Struk Pembayaran</h2>
            <p>Tanggal: ${format(new Date(), "PPp")}</p>
            <p>Kasir: ${cashierName}</p>
          </div>
          <div class="divider"></div>
          ${cart.map(item => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>Rp${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">
            <div class="item">
              <span>Total:</span>
              <span>Rp${total.toFixed(2)}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="header">
            <p>Terima kasih atas kunjungan Anda!</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const filteredProducts = products.filter(product =>
    (!selectedCategory || product.category === selectedCategory) &&
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Input
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Kembali ke Dashboard
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              Semua
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => addToCart(product)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  <p className="text-lg font-bold">Rp{product.Harga.toFixed(2)}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Penjualan Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Rp{item.Harga.toFixed(2)} per item</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <p className="text-center text-muted-foreground">Keranjang kosong</p>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>Rp{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={printReceipt}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak
                  </Button>
                  <Button
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={completeSale}
                  >
                    Selesaikan Penjualan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden" ref={receiptRef} />
    </div>
  );
}
