
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    const fetchSales = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          throw error;
        }

        setSales(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching sales",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
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
      setSaleItems(data || []);
      setDetailsOpen(true);
    } catch (error: any) {
      toast({
        title: "Error fetching sale details",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);

    try {
      console.log("Starting delete operation for sale ID:", saleToDelete.id);
      
      // First check if there are any sale items
      const { data: itemsData, error: checkError } = await supabase
        .from("sale_items")
        .select("id")
        .eq("sale_id", saleToDelete.id);
        
      if (checkError) {
        console.error("Error checking sale items:", checkError);
        throw checkError;
      }
      
      console.log(`Found ${itemsData?.length || 0} sale items to delete`);
      
      // Only attempt to delete items if there are any
      if (itemsData && itemsData.length > 0) {
        console.log("Deleting sale items for sale ID:", saleToDelete.id);
        const { error: itemsError } = await supabase
          .from("sale_items")
          .delete()
          .eq("sale_id", saleToDelete.id);

        if (itemsError) {
          console.error("Error deleting sale items:", itemsError);
          throw itemsError;
        }
        console.log("Sale items successfully deleted");
      }

      console.log("Now deleting sale with ID:", saleToDelete.id);
      // Then delete the sale
      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToDelete.id);

      if (saleError) {
        console.error("Error deleting sale:", saleError);
        throw saleError;
      }

      console.log("Sale successfully deleted from database");
      
      // Update the local state to remove the deleted sale
      setSales(prevSales => prevSales.filter(s => s.id !== saleToDelete.id));
      
      // Close the dialog and reset state AFTER successful deletion
      setDeleteDialogOpen(false);
      setSaleToDelete(null);

      toast({
        title: "Sale deleted",
        description: "The sale has been permanently deleted",
      });
    } catch (error: any) {
      console.error("Delete operation failed:", error);
      toast({
        title: "Error deleting sale",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
          Back
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
            {sales.length > 0 ? (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.created_at), "PPp")}</TableCell>
                  <TableCell className="font-medium">{sale.id.slice(0, 8)}</TableCell>
                  <TableCell className="capitalize">{sale.payment_method}</TableCell>
                  <TableCell className="capitalize">{sale.status}</TableCell>
                  <TableCell className="text-right">Rp{sale.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewSaleDetails(sale)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSale(sale)}
                        disabled={isDeleting && saleToDelete?.id === sale.id}
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
                  No sales records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Review the details of this sale
            </DialogDescription>
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
                  {saleItems.length > 0 ? (
                    saleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{item.product.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">Rp{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Rp{item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No items found for this sale.
                      </TableCell>
                    </TableRow>
                  )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale record
              and all associated items from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                // Prevent default to avoid closing the dialog automatically
                e.preventDefault();
                confirmDelete();
              }} 
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
