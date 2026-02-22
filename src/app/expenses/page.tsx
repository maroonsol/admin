"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye } from "lucide-react";

interface ExpenseInvoice {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalInvoiceAmount: number;
  invoiceFileUrl: string | null;
  vendor: {
    id: string;
    vendorName: string;
  } | null;
}

interface Expense {
  id: string;
  expenseType: "DIRECT" | "INDIRECT";
  withGst: boolean;
  vcrNumber: string;
  paymentMethod: string;
  paidOn: string;
  invoices: ExpenseInvoice[];
  paidBy: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  paidTo: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  createdAt: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getExpenseTypeColor = (type: string) => {
    return type === "DIRECT" 
      ? "bg-blue-100 text-blue-800" 
      : "bg-purple-100 text-purple-800";
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: "Cash",
      UPI: "UPI",
      NEFT_RTGS: "NEFT/RTGS",
      IMPS: "IMPS",
      CHEQUE: "Cheque",
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Manage and track all your expenses</p>
        </div>
        <Button 
          onClick={() => router.push('/expenses/create')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Direct Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {expenses.filter(exp => exp.expenseType === "DIRECT").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Indirect Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {expenses.filter(exp => exp.expenseType === "INDIRECT").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VCR Number</TableHead>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500">
                    No expenses found. Click &quot;Create Expense&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.vcrNumber}
                    </TableCell>
                    <TableCell>
                      {expense.invoices.length > 0 
                        ? expense.invoices.map(inv => inv.invoiceNumber).filter(Boolean).join(", ") || "-"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getExpenseTypeColor(expense.expenseType)}>
                        {expense.expenseType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expense.invoices.length > 0 
                        ? expense.invoices.map(inv => inv.vendor?.vendorName).filter(Boolean).join(", ") || "-"
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(
                        expense.invoices.reduce((sum, inv) => sum + inv.totalInvoiceAmount, 0)
                      )}
                    </TableCell>
                    <TableCell>{getPaymentMethodLabel(expense.paymentMethod)}</TableCell>
                    <TableCell>
                      {expense.paidBy 
                        ? `${expense.paidBy.firstName} ${expense.paidBy.lastName || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{formatDate(expense.paidOn)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={expense.withGst ? "text-green-600 border-green-600" : "text-gray-600 border-gray-600"}>
                        {expense.withGst ? "With GST" : "No GST"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {expense.invoices.map((invoice, idx) => 
                            invoice.invoiceFileUrl && (
                              <DropdownMenuItem key={invoice.id} asChild>
                                <a href={invoice.invoiceFileUrl} target="_blank" rel="noopener noreferrer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Invoice {idx + 1}
                                </a>
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

