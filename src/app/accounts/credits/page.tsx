"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BusinessInfo {
  id: string;
  businessName: string;
  gstNumber: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  roundedAmount: number;
  balanceAmount: number;
  totalPaid: number;
  paid: boolean;
  partialPayment: boolean;
  businessId: string | null;
  business: BusinessInfo | null;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
}

interface PaymentCredit {
  id: string;
  creditNumber: number;
  creditAmount: number;
  creditDate: string;
  bankAccount: BankAccount;
  invoiceCredits: Array<{
    invoice: {
      invoiceNumber: string;
    };
    creditAmount: number;
  }>;
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<PaymentCredit[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"single" | "multiple">("single");
  
  // Year and month selection
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  
  // Invoice state
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Common state
  const [bankAccountId, setBankAccountId] = useState("");
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditAmount, setCreditAmount] = useState(0);

  useEffect(() => {
    fetchCredits();
    fetchBanks();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/credits");
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch("/api/banks");
      if (response.ok) {
        const data = await response.json();
        setBanks(data);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const fetchInvoicesByMonth = useCallback(async () => {
    if (!selectedYear || !selectedMonth) return;
    
    setLoadingInvoices(true);
    try {
      const response = await fetch(`/api/invoices/list?year=${selectedYear}&month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableInvoices(data);
      } else {
        console.error("Failed to fetch invoices");
        setAvailableInvoices([]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setAvailableInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchCredits();
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchInvoicesByMonth();
    }
  }, [selectedYear, selectedMonth, fetchInvoicesByMonth]);

  useEffect(() => {
    if (paymentType === "single" && selectedInvoice) {
      // Use balance amount, not rounded amount
      setCreditAmount(selectedInvoice.balanceAmount);
    } else if (paymentType === "multiple" && selectedInvoices.length > 0) {
      // Sum balance amounts for multiple invoices
      const total = selectedInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
      setCreditAmount(total);
    } else {
      setCreditAmount(0);
    }
  }, [selectedInvoice, selectedInvoices, paymentType]);

  // Auto-select first bank when dialog opens and banks are available
  useEffect(() => {
    if (isDialogOpen && banks.length > 0 && !bankAccountId) {
      setBankAccountId(banks[0].id);
    }
  }, [isDialogOpen, banks, bankAccountId]);

  const handleToggleInvoice = (invoice: Invoice) => {
    setSelectedInvoices(prev => {
      const exists = prev.find(inv => inv.id === invoice.id);
      if (exists) {
        return prev.filter(inv => inv.id !== invoice.id);
      } else {
        return [...prev, invoice];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankAccountId || !creditDate) {
      alert("Please select bank account and credit date");
      return;
    }

    if (paymentType === "single") {
      if (!selectedInvoice) {
        alert("Please select an invoice");
        return;
      }
    } else {
      if (selectedInvoices.length === 0) {
        alert("Please select at least one invoice");
        return;
      }
    }

    try {
      // For single invoice, use the entered credit amount
      // For multiple invoices, use each invoice's balance amount
      const finalInvoiceCredits = paymentType === "single"
        ? [{
            invoiceId: selectedInvoice!.id,
            creditAmount: creditAmount,
            businessId: selectedInvoice!.businessId,
            roundedAmount: selectedInvoice!.roundedAmount,
            balanceAmount: selectedInvoice!.balanceAmount,
          }]
        : selectedInvoices.map(inv => ({
            invoiceId: inv.id,
            creditAmount: inv.balanceAmount, // Use balance amount for each invoice
            businessId: inv.businessId,
            roundedAmount: inv.roundedAmount,
            balanceAmount: inv.balanceAmount,
          }));

      const totalCreditAmount = finalInvoiceCredits.reduce((sum, ic) => sum + ic.creditAmount, 0);

      const response = await fetch("/api/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditAmount: totalCreditAmount,
          creditDate,
          bankAccountId,
          invoiceCredits: finalInvoiceCredits,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchCredits();
        alert("Credit added successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create credit");
      }
    } catch (error) {
      console.error("Error creating credit:", error);
      alert("Failed to create credit");
    }
  };

  const resetForm = () => {
    setPaymentType("single");
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedInvoice(null);
    setSelectedInvoices([]);
    setBankAccountId("");
    setCreditDate(new Date().toISOString().split('T')[0]);
    setCreditAmount(0);
    setAvailableInvoices([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

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
          <h1 className="text-3xl font-bold text-gray-900">Payment Credits</h1>
          <p className="text-gray-600 mt-1">Manage payment credits received</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Credit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Credits</CardTitle>
        </CardHeader>
        <CardContent>
          {credits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit #</TableHead>
                  <TableHead>Credit Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-semibold">
                      {credit.creditNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(credit.creditDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(credit.creditAmount)}
                    </TableCell>
                    <TableCell>
                      {credit.bankAccount.bankName} - {credit.bankAccount.accountNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {credit.invoiceCredits.map((ic, idx) => (
                          <Badge key={idx} variant="outline">
                            {ic.invoice.invoiceNumber}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(credit.creditDate).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No credits found. Add your first credit to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Credit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Payment Credit</DialogTitle>
            <DialogDescription>
              Record a payment credit received in your bank account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Payment Type Selection */}
              <div>
                <Label>Payment Type *</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="single"
                      checked={paymentType === "single"}
                      onChange={() => {
                        setPaymentType("single");
                        setSelectedInvoice(null);
                        setSelectedInvoices([]);
                      }}
                      className="w-4 h-4"
                    />
                    <span>Single Invoice</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="multiple"
                      checked={paymentType === "multiple"}
                      onChange={() => {
                        setPaymentType("multiple");
                        setSelectedInvoice(null);
                      }}
                      className="w-4 h-4"
                    />
                    <span>Multiple Invoices</span>
                  </label>
                </div>
              </div>

              {/* Year and Month Selection */}
              <div className="space-y-4 border p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="month">Month *</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Invoice List */}
                {loadingInvoices ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading invoices...</p>
                  </div>
                ) : availableInvoices.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Select Invoice{paymentType === "multiple" ? "s" : ""} *</Label>
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {availableInvoices.map((invoice) => {
                        const isSelected = paymentType === "single"
                          ? selectedInvoice?.id === invoice.id
                          : selectedInvoices.some(inv => inv.id === invoice.id);
                        
                        return (
                          <div
                            key={invoice.id}
                            onClick={() => {
                              if (paymentType === "single") {
                                setSelectedInvoice(invoice);
                                setSelectedInvoices([]);
                              } else {
                                handleToggleInvoice(invoice);
                              }
                            }}
                            className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                              isSelected ? "bg-blue-50 border-blue-200" : ""
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{invoice.invoiceNumber}</p>
                                <p className="text-sm text-gray-600">
                                  {invoice.invoiceType} | Balance: {formatCurrency(invoice.balanceAmount)}
                                  {invoice.partialPayment && (
                                    <span className="text-orange-600"> | Partial Payment</span>
                                  )}
                                  {invoice.business && (
                                    <span> | {invoice.business.businessName}</span>
                                  )}
                                </p>
                              </div>
                              {isSelected && (
                                <Badge variant="default">Selected</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : selectedYear && selectedMonth ? (
                  <div className="text-center py-8 text-gray-500">
                    No invoices found for {months[parseInt(selectedMonth) - 1]?.label} {selectedYear}
                  </div>
                ) : null}

                {/* Selected Invoice Display (Single) */}
                {paymentType === "single" && selectedInvoice && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">
                          Type: {selectedInvoice.invoiceType} | Balance: {formatCurrency(selectedInvoice.balanceAmount)}
                          {selectedInvoice.partialPayment && (
                            <span className="text-orange-600"> | Partial Payment</span>
                          )}
                          {selectedInvoice.business && (
                            <span> | Business: {selectedInvoice.business.businessName}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoice(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Selected Invoices Display (Multiple) */}
                {paymentType === "multiple" && selectedInvoices.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-semibold mb-2">Selected Invoices ({selectedInvoices.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvoices.map((inv) => (
                        <Badge
                          key={inv.id}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => handleToggleInvoice(inv)}
                        >
                          {inv.invoiceNumber} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Credit Amount */}
              <div>
                <Label htmlFor="creditAmount">Credit Amount *</Label>
                <Input
                  id="creditAmount"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (paymentType === "single" && selectedInvoice) {
                      // Don't allow more than balance amount for single invoice
                      const maxAmount = selectedInvoice.balanceAmount;
                      setCreditAmount(Math.min(value, maxAmount));
                    } else {
                      // For multiple invoices, allow any value
                      setCreditAmount(value);
                    }
                  }}
                  min="0"
                  step="0.01"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {paymentType === "single" && selectedInvoice
                    ? `Balance Amount: ${formatCurrency(selectedInvoice.balanceAmount)} (Max: ${formatCurrency(selectedInvoice.balanceAmount)})`
                    : paymentType === "multiple" && selectedInvoices.length > 0
                    ? `Total Balance: ${formatCurrency(selectedInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0))}`
                    : "Enter credit amount"}
                </p>
              </div>

              {/* Bank Account */}
              <div>
                <Label htmlFor="bankAccount">Bank Account *</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Credit Date */}
              <div>
                <Label htmlFor="creditDate">Credit Date *</Label>
                <Input
                  id="creditDate"
                  type="date"
                  value={creditDate}
                  onChange={(e) => setCreditDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Credit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

