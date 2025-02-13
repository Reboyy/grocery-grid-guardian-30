
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: {
    name: string;
    sku: string;
  }
}

export default function Sales() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast({
          title: "Error fetching sales",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSales(data);
      setLoading(false);
    };

    checkAuth();
    fetchSales();
  }, [navigate, toast]);

  const viewSaleDetails = async (sale: Sale) => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          *,
          product:products (
            name,
            sku
          )
        `)
        .eq("sale_id", sale.id);

      if (error) throw error;

      setSelectedSale(sale);
      setSaleItems(data);
      setDetailsOpen(true);
    } catch (error: any) {
      toast({
        title: "Error fetching sale details",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Receipt ID</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{format(new Date(sale.created_at), "PPp")}</TableCell>
                <TableCell className="font-medium">{sale.id.slice(0, 8)}</TableCell>
                <TableCell className="capitalize">{sale.payment_method}</TableCell>
                <TableCell className="capitalize">{sale.status}</TableCell>
                <TableCell className="text-right">Rp{sale.total_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewSaleDetails(sale)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt ID</p>
                  <p className="font-medium">{selectedSale.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), "PPp")}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.product.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">Rp{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Rp{item.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">Rp{selectedSale.total_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
