"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { indianStates, singaporeStates, expenseCategories } from "@/lib/data";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";

interface Vendor {
  id: string;
  vendorName: string;
  additionalName: string | null;
  gstNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  stateCode: string | null;
  country: string;
  pincode: string | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string | null;
  employeeId: string | null;
}

interface TaxBreakdown {
  id: string;
  taxableAmount: number;
  taxPercentage: number;
  taxAmount: number;
}

interface Business {
  id: string;
  gstNumber: string;
  businessName: string;
  businessState: string | null;
}

interface ExpenseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  expenseCategory: string;
  isGstPaymentReceipt: boolean;
  withGst: boolean;
  businessId: string;
  vendorSearchTerm: string;
  vendorSearchResults: Vendor[];
  showVendorDropdown: boolean;
  selectedVendor: Vendor | null;
  vendorData: {
    vendorName: string;
    additionalName: string;
    gstNumber: string;
    phone: string;
    email: string;
    address: string;
    state: string;
    country: string;
    pincode: string;
  };
  totalInvoiceAmount: string;
  taxBreakdowns: TaxBreakdown[];
  invoiceFileUrl: string | null;
  invoiceFile: File | null;
  uploading: boolean;
}

export default function CreateExpensePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [expenseType, setExpenseType] = useState<"DIRECT" | "INDIRECT" | null>(null);
  
  // Businesses for GST payment receipts
  const [businesses, setBusinesses] = useState<Business[]>([]);
  
  // Multiple invoices
  const [invoices, setInvoices] = useState<ExpenseInvoice[]>([
    {
      id: "1",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      expenseCategory: "",
      isGstPaymentReceipt: false,
      withGst: false,
      businessId: "",
      vendorSearchTerm: "",
      vendorSearchResults: [],
      showVendorDropdown: false,
      selectedVendor: null,
      vendorData: {
        vendorName: "",
        additionalName: "",
        gstNumber: "",
        phone: "",
        email: "",
        address: "",
        state: "",
        country: "India",
        pincode: "",
      },
      totalInvoiceAmount: "",
      taxBreakdowns: [{ id: "1", taxableAmount: 0, taxPercentage: 0, taxAmount: 0 }],
      invoiceFileUrl: null,
      invoiceFile: null,
      uploading: false,
    }
  ]);
  
  // VCR number
  const [vcrNumber, setVcrNumber] = useState<string>("");
  
  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState("");
  
  // Payment date
  const [paidOn, setPaidOn] = useState("");
  
  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paidById, setPaidById] = useState<string>("");
  const [paidToId, setPaidToId] = useState<string>("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchBusinesses();
    
    // Set default paid on date to today
    const today = new Date().toISOString().split('T')[0];
    setPaidOn(today);
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/business-info?search=all');
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  useEffect(() => {
    // Fetch VCR number when expense type is selected
    if (expenseType) {
      fetchVCRNumber();
    }
  }, [expenseType]);

  const fetchVCRNumber = async () => {
    try {
      const response = await fetch('/api/expenses/next-vcr');
      if (response.ok) {
        const data = await response.json();
        setVcrNumber(data.vcrNumber);
      }
    } catch (error) {
      console.error('Error fetching VCR number:', error);
    }
  };

  useEffect(() => {
    if (expenseType === "DIRECT" && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [expenseType, currentStep]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Invoice management functions
  const addInvoice = () => {
    const today = new Date().toISOString().split('T')[0];
    const newInvoice: ExpenseInvoice = {
      id: Date.now().toString(),
      invoiceNumber: "",
      invoiceDate: today,
      expenseCategory: "",
      isGstPaymentReceipt: false,
      withGst: false,
      businessId: "",
      vendorSearchTerm: "",
      vendorSearchResults: [],
      showVendorDropdown: false,
      selectedVendor: null,
      vendorData: {
        vendorName: "",
        additionalName: "",
        gstNumber: "",
        phone: "",
        email: "",
        address: "",
        state: "",
        country: "India",
        pincode: "",
      },
      totalInvoiceAmount: "",
      taxBreakdowns: [{ id: "1", taxableAmount: 0, taxPercentage: 0, taxAmount: 0 }],
      invoiceFileUrl: null,
      invoiceFile: null,
      uploading: false,
    };
    setInvoices(prev => [...prev, newInvoice]);
  };

  const removeInvoice = (invoiceId: string) => {
    if (invoices.length > 1) {
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    }
  };

  const updateInvoice = (invoiceId: string, updates: Partial<ExpenseInvoice>) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { ...inv, ...updates } : inv
    ));
  };

  // Vendor search per invoice
  const handleVendorSearch = async (invoiceId: string, searchTerm: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    updateInvoice(invoiceId, { vendorSearchTerm: searchTerm });
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      updateInvoice(invoiceId, { vendorSearchResults: [], showVendorDropdown: false });
      return;
    }

    try {
      const response = await fetch(`/api/vendors?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const results = await response.json();
        updateInvoice(invoiceId, { vendorSearchResults: results, showVendorDropdown: true });
      }
    } catch (error) {
      console.error("Error searching vendors:", error);
      updateInvoice(invoiceId, { vendorSearchResults: [], showVendorDropdown: false });
    }
  };

  const handleVendorSelect = (invoiceId: string, vendor: Vendor) => {
    updateInvoice(invoiceId, {
      selectedVendor: vendor,
      vendorSearchTerm: vendor.vendorName,
      showVendorDropdown: false,
      vendorData: {
        vendorName: vendor.vendorName,
        additionalName: vendor.additionalName || "",
        gstNumber: vendor.gstNumber || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: vendor.address || "",
        state: vendor.state || "",
        country: vendor.country || "India",
        pincode: vendor.pincode || "",
      },
    });
  };

  const handleClearVendor = (invoiceId: string) => {
    updateInvoice(invoiceId, {
      selectedVendor: null,
      vendorSearchTerm: "",
      vendorSearchResults: [],
      showVendorDropdown: false,
      vendorData: {
        vendorName: "",
        additionalName: "",
        gstNumber: "",
        phone: "",
        email: "",
        address: "",
        state: "",
        country: "India",
        pincode: "",
      },
    });
  };

  // Tax breakdown functions per invoice
  const handleTaxBreakdownChange = (invoiceId: string, taxBreakdownId: string, field: string, value: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const updatedBreakdowns = invoice.taxBreakdowns.map(tb => {
      if (tb.id === taxBreakdownId) {
        const updated = { ...tb, [field]: value };
        if (field === 'taxableAmount' || field === 'taxPercentage') {
          updated.taxAmount = (updated.taxableAmount * updated.taxPercentage) / 100;
        }
        return updated;
      }
      return tb;
    });

    updateInvoice(invoiceId, { taxBreakdowns: updatedBreakdowns });
  };

  const addTaxBreakdown = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const newBreakdown: TaxBreakdown = {
      id: Date.now().toString(),
      taxableAmount: 0,
      taxPercentage: 0,
      taxAmount: 0
    };

    updateInvoice(invoiceId, { taxBreakdowns: [...invoice.taxBreakdowns, newBreakdown] });
  };

  const removeTaxBreakdown = (invoiceId: string, taxBreakdownId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice || invoice.taxBreakdowns.length <= 1) return;

    updateInvoice(invoiceId, { 
      taxBreakdowns: invoice.taxBreakdowns.filter(tb => tb.id !== taxBreakdownId) 
    });
  };

  // File upload per invoice
  const handleFileUpload = async (invoiceId: string, file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    updateInvoice(invoiceId, { uploading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        updateInvoice(invoiceId, { 
          invoiceFileUrl: result.url, 
          invoiceFile: file,
          uploading: false 
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload file');
        updateInvoice(invoiceId, { uploading: false });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      updateInvoice(invoiceId, { uploading: false });
    }
  };

  const calculateTotalFromTaxBreakdowns = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return 0;
    return invoice.taxBreakdowns.reduce((sum, tb) => sum + tb.taxableAmount + tb.taxAmount, 0);
  };

  const handleNext = () => {
    // Validation based on current step
    if (currentStep === 1 && !expenseType) {
      alert('Please select an expense type');
      return;
    }
    
    if (currentStep === 2) {
      // Validate all invoices
      for (const invoice of invoices) {
        // Validate based on invoice type
        if (invoice.isGstPaymentReceipt) {
          // For GST payment receipts, validate business selection
          if (!invoice.businessId) {
            alert(`Please select a business for GST payment receipt ${invoices.indexOf(invoice) + 1}`);
            return;
          }
        } else {
          // For vendor payments, validate vendor
          if (!invoice.vendorData.vendorName.trim()) {
            alert(`Vendor name is required for invoice ${invoices.indexOf(invoice) + 1}`);
            return;
          }
        }
        
        if (!invoice.totalInvoiceAmount || parseFloat(invoice.totalInvoiceAmount) <= 0) {
          alert(`Please enter a valid total invoice amount for invoice ${invoices.indexOf(invoice) + 1}`);
          return;
        }
        
        if (invoice.withGst) {
          const totalFromBreakdowns = calculateTotalFromTaxBreakdowns(invoice.id);
          if (Math.abs(totalFromBreakdowns - parseFloat(invoice.totalInvoiceAmount)) > 0.01) {
            alert(`Total from tax breakdowns does not match total invoice amount for invoice ${invoices.indexOf(invoice) + 1}`);
            return;
          }
        }
        
        if (!invoice.invoiceFileUrl) {
          alert(`Please upload the invoice PDF for invoice ${invoices.indexOf(invoice) + 1}`);
          return;
        }
      }
    }
    
    if (currentStep === 3) {
      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }
      
      // Calculate total amount from all invoices
      const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalInvoiceAmount || "0"), 0);
      
      if (paymentMethod === 'CASH' && totalAmount >= 2000) {
        alert('Cash payment is only allowed for amounts less than ₹2000');
        return;
      }
      
      if (paymentMethod === 'CHEQUE' && !chequeNumber.trim()) {
        alert('Cheque number is required for cheque payments');
        return;
      }
    }
    
    if (currentStep === 4) {
      if (!paidOn) {
        alert('Please select a payment date');
        return;
      }
      
      const paidOnDate = new Date(paidOn);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      
      if (paidOnDate > today) {
        alert('Payment date cannot be in the future');
        return;
      }
      
      if (paidOnDate < oneYearAgo) {
        alert('Payment date cannot be more than 1 year in the past');
        return;
      }
    }
    
    if (currentStep === 5) {
      if (!paidById) {
        alert('Please select who paid for this expense');
        return;
      }
      
      if (expenseType === "INDIRECT" && !paidToId) {
        alert('Please select who this expense was paid to');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Process all invoices and save vendors
      const processedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
          let vendorId = invoice.selectedVendor?.id || null;
          
          // Save vendor if new and not GST payment receipt
          if (!invoice.isGstPaymentReceipt && !invoice.selectedVendor && invoice.vendorData.vendorName) {
            const vendorPayload: {
              vendorName: string;
              additionalName?: string | null;
              gstNumber?: string | null;
              phone?: string | null;
              email?: string | null;
              address?: string | null;
              state?: string | null;
              stateCode?: string | null;
              country: string;
              pincode?: string | null;
            } = {
              ...invoice.vendorData,
            };
            
            // Only add state code for India
            if (invoice.vendorData.country === "India") {
              vendorPayload.stateCode = indianStates.find(s => s.name === invoice.vendorData.state)?.code || "";
            } else {
              vendorPayload.stateCode = null;
            }
            
            const vendorResponse = await fetch('/api/vendors', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(vendorPayload),
            });

            if (vendorResponse.ok) {
              const newVendor = await vendorResponse.json();
              vendorId = newVendor.id;
            } else {
              const error = await vendorResponse.json();
              throw new Error(error.error || `Failed to save vendor for invoice ${invoices.indexOf(invoice) + 1}`);
            }
          }

          return {
            invoiceNumber: invoice.invoiceNumber || null,
            invoiceDate: invoice.invoiceDate || null,
            expenseCategory: invoice.expenseCategory || null,
            isGstPaymentReceipt: invoice.isGstPaymentReceipt || false,
            withGst: invoice.withGst || false,
            businessId: invoice.isGstPaymentReceipt ? invoice.businessId || null : null,
            vendorId: invoice.isGstPaymentReceipt ? null : vendorId,
            totalInvoiceAmount: parseFloat(invoice.totalInvoiceAmount),
            invoiceFileUrl: invoice.invoiceFileUrl || null,
            taxBreakdowns: invoice.withGst ? invoice.taxBreakdowns : [],
          };
        })
      );

      // Prepare expense data
      const expenseData = {
        expenseType,
        invoices: processedInvoices,
        paymentMethod,
        chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : null,
        paidOn,
        paidById,
        paidToId: expenseType === "INDIRECT" ? paidToId : null,
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        alert('Expense created successfully!');
        router.push('/expenses');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Expense Type Selection
  if (currentStep === 1) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Expenses
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Expense</h1>
            <p className="text-gray-600 mt-1">Select the type of expense</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => {
              setExpenseType("DIRECT");
              setCurrentStep(2);
            }}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">💼</div>
              <CardTitle className="text-xl">Direct Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Business expenses with vendor invoices and GST details
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500"
            onClick={() => {
              setExpenseType("INDIRECT");
              setCurrentStep(2);
            }}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <CardTitle className="text-xl">Indirect Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Internal expenses like employee reimbursements
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 2: // Multiple Invoices
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Invoices</h2>
                <p className="text-gray-600">Add one or more invoices for this expense</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label>VCR Number (Auto-generated)</Label>
                  <Input
                    value={vcrNumber}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed w-40"
                    placeholder="Auto-generated"
                  />
                </div>
                <Button type="button" onClick={addInvoice} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Invoice
                </Button>
              </div>
            </div>

            {invoices.map((invoice, invoiceIndex) => (
              <Card key={invoice.id} className="border-2">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Invoice {invoiceIndex + 1}</CardTitle>
                    {invoices.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeInvoice(invoice.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Invoice Number, Date, and Category */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Invoice Number</Label>
                      <Input
                        value={invoice.invoiceNumber}
                        onChange={(e) => updateInvoice(invoice.id, { invoiceNumber: e.target.value })}
                        placeholder="Enter invoice number (any format)"
                      />
                    </div>
                    <div>
                      <Label>Invoice Date</Label>
                      <Input
                        type="date"
                        value={invoice.invoiceDate}
                        onChange={(e) => updateInvoice(invoice.id, { invoiceDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Expense Category (Optional)</Label>
                      <Select
                        value={invoice.expenseCategory}
                        onValueChange={(value) => updateInvoice(invoice.id, { expenseCategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* GST Payment Receipt Checkbox */}
                  <div className="flex items-center space-x-2 border-t pt-4">
                    <Checkbox
                      id={`isGstReceipt-${invoice.id}`}
                      checked={invoice.isGstPaymentReceipt}
                      onCheckedChange={(checked) => {
                        updateInvoice(invoice.id, { 
                          isGstPaymentReceipt: checked === true,
                          businessId: checked === true ? "" : invoice.businessId,
                          // Clear vendor data when switching to GST receipt
                          selectedVendor: checked === true ? null : invoice.selectedVendor,
                          vendorSearchTerm: checked === true ? "" : invoice.vendorSearchTerm,
                          vendorData: checked === true ? {
                            vendorName: "",
                            additionalName: "",
                            gstNumber: "",
                            phone: "",
                            email: "",
                            address: "",
                            state: "",
                            country: "India",
                            pincode: "",
                          } : invoice.vendorData,
                        });
                      }}
                    />
                    <Label htmlFor={`isGstReceipt-${invoice.id}`} className="text-base font-normal cursor-pointer">
                      Is this a GST payment receipt?
                    </Label>
                  </div>

                  {/* With GST Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`withGst-${invoice.id}`}
                      checked={invoice.withGst}
                      onCheckedChange={(checked) => {
                        updateInvoice(invoice.id, { 
                          withGst: checked === true,
                          // Clear tax breakdowns if unchecking GST
                          taxBreakdowns: checked === true ? invoice.taxBreakdowns : [{ id: "1", taxableAmount: 0, taxPercentage: 0, taxAmount: 0 }],
                        });
                      }}
                    />
                    <Label htmlFor={`withGst-${invoice.id}`} className="text-base font-normal cursor-pointer">
                      With GST
                    </Label>
                  </div>

                  {/* Business Selection - Only show if GST payment receipt */}
                  {invoice.isGstPaymentReceipt && (
                    <div>
                      <Label>Receipt of which business? *</Label>
                      <Select
                        value={invoice.businessId}
                        onValueChange={(value) => updateInvoice(invoice.id, { businessId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business" />
                        </SelectTrigger>
                        <SelectContent>
                          {businesses.map((business) => (
                            <SelectItem key={business.id} value={business.id}>
                              {business.businessName} {business.gstNumber ? `(${business.gstNumber})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Vendor Search - Only show if not GST payment receipt */}
                  {!invoice.isGstPaymentReceipt && (
                    <div className="relative">
                      <Label>Vendor Name or GST Number *</Label>
                    <div className="relative">
                      <Input
                        value={invoice.vendorSearchTerm}
                        onChange={(e) => handleVendorSearch(invoice.id, e.target.value)}
                        onFocus={() => {
                          if (invoice.vendorSearchTerm.length >= 2) {
                            updateInvoice(invoice.id, { showVendorDropdown: true });
                          }
                        }}
                        placeholder="Type vendor name or GST number to search..."
                      />
                      {invoice.selectedVendor && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearVendor(invoice.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {invoice.showVendorDropdown && invoice.vendorSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {invoice.vendorSearchResults.map((vendor) => (
                          <div
                            key={vendor.id}
                            onClick={() => handleVendorSelect(invoice.id, vendor)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          >
                            <div className="font-medium">{vendor.vendorName}</div>
                            {vendor.gstNumber && (
                              <div className="text-sm text-gray-600">GST: {vendor.gstNumber}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Vendor Details - Only show if not GST payment receipt */}
                  {!invoice.isGstPaymentReceipt && (
                    <>
                      <div>
                        <Label>Vendor Name *</Label>
                        <Input
                          value={invoice.vendorData.vendorName}
                          onChange={(e) => updateInvoice(invoice.id, { 
                            vendorData: { ...invoice.vendorData, vendorName: e.target.value } 
                          })}
                          required
                        />
                      </div>

                      <div>
                        <Label>Additional Name (Optional)</Label>
                        <Input
                          value={invoice.vendorData.additionalName}
                          onChange={(e) => updateInvoice(invoice.id, { 
                            vendorData: { ...invoice.vendorData, additionalName: e.target.value } 
                          })}
                        />
                      </div>

                      <div>
                        <Label>GST Number (Optional, Unique)</Label>
                        <Input
                          value={invoice.vendorData.gstNumber}
                          onChange={(e) => updateInvoice(invoice.id, { 
                            vendorData: { ...invoice.vendorData, gstNumber: e.target.value } 
                          })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={invoice.vendorData.phone}
                            onChange={(e) => updateInvoice(invoice.id, { 
                              vendorData: { ...invoice.vendorData, phone: e.target.value } 
                            })}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={invoice.vendorData.email}
                            onChange={(e) => updateInvoice(invoice.id, { 
                              vendorData: { ...invoice.vendorData, email: e.target.value } 
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Address</Label>
                        <Textarea
                          value={invoice.vendorData.address}
                          onChange={(e) => updateInvoice(invoice.id, { 
                            vendorData: { ...invoice.vendorData, address: e.target.value } 
                          })}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Country *</Label>
                          <Select
                            value={invoice.vendorData.country}
                            onValueChange={(value) => {
                              updateInvoice(invoice.id, { 
                                vendorData: { ...invoice.vendorData, country: value, state: "" } 
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="Singapore">Singapore</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Pincode</Label>
                          <Input
                            value={invoice.vendorData.pincode}
                            onChange={(e) => updateInvoice(invoice.id, { 
                              vendorData: { ...invoice.vendorData, pincode: e.target.value } 
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>State</Label>
                        <Select
                          value={invoice.vendorData.state}
                          onValueChange={(value) => updateInvoice(invoice.id, { 
                            vendorData: { ...invoice.vendorData, state: value } 
                          })}
                          disabled={!invoice.vendorData.country}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={invoice.vendorData.country ? "Select state" : "Select country first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {invoice.vendorData.country === "India" && indianStates.map((state) => (
                              <SelectItem key={state.code} value={state.name}>
                                {state.name} ({state.code})
                              </SelectItem>
                            ))}
                            {invoice.vendorData.country === "Singapore" && singaporeStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Total Invoice Amount */}
                  <div>
                    <Label>Total Invoice Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoice.totalInvoiceAmount}
                      onChange={(e) => updateInvoice(invoice.id, { totalInvoiceAmount: e.target.value })}
                      required
                    />
                  </div>

                  {/* GST Breakdown */}
                  {invoice.withGst && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <Label>Tax Breakdown</Label>
                        <Button type="button" onClick={() => addTaxBreakdown(invoice.id)} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add More
                        </Button>
                      </div>

                      {invoice.taxBreakdowns.map((tb, index) => (
                        <div key={tb.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Tax Row {index + 1}</h4>
                            {invoice.taxBreakdowns.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeTaxBreakdown(invoice.id, tb.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Taxable Amount</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={tb.taxableAmount}
                                onChange={(e) => handleTaxBreakdownChange(invoice.id, tb.id, 'taxableAmount', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label>Tax Percentage (%)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={tb.taxPercentage}
                                onChange={(e) => handleTaxBreakdownChange(invoice.id, tb.id, 'taxPercentage', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label>Tax Amount (Auto-calculated)</Label>
                              <div className="p-2 bg-gray-50 rounded">
                                ₹{tb.taxAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between font-medium">
                          <span>Total from Tax Breakdowns:</span>
                          <span>₹{calculateTotalFromTaxBreakdowns(invoice.id).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Upload */}
                  <div className="border-t pt-4">
                    <Label>Upload Invoice PDF *</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(invoice.id, file);
                          }
                        }}
                        disabled={invoice.uploading}
                      />
                    </div>
                    {invoice.uploading && (
                      <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                    )}
                    {invoice.invoiceFileUrl && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">✓ File uploaded successfully</p>
                        <a href={invoice.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          View uploaded file
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 3: // Payment Details
        return (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    if (value !== 'CHEQUE') {
                      setChequeNumber("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash (Only if amount &lt; ₹2000)</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT_RTGS">NEFT / RTGS</SelectItem>
                    <SelectItem value="IMPS">IMPS</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
                {paymentMethod === 'CASH' && invoices.reduce((sum, inv) => sum + parseFloat(inv.totalInvoiceAmount || "0"), 0) >= 2000 && (
                  <p className="text-sm text-red-500 mt-1">
                    Cash payment is only allowed for amounts less than ₹2000
                  </p>
                )}
              </div>

              {paymentMethod === 'CHEQUE' && (
                <div>
                  <Label htmlFor="chequeNumber">Cheque Number *</Label>
                  <Input
                    id="chequeNumber"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4: // Payment Date
        return (
          <Card>
            <CardHeader>
              <CardTitle>Payment Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paidOn">Paid On *</Label>
                <Input
                  id="paidOn"
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Select today or a past date (maximum 1 year before today)
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 5: // Paid By / Paid To
        return (
          <Card>
            <CardHeader>
              <CardTitle>Paid By / Paid To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paidBy">Paid By *</Label>
                <Select
                  value={paidById}
                  onValueChange={setPaidById}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName || ""} {emp.employeeId ? `(${emp.employeeId})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {expenseType === "INDIRECT" && (
                <div>
                  <Label htmlFor="paidTo">Paid To *</Label>
                  <Select
                    value={paidToId}
                    onValueChange={setPaidToId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName || ""} {emp.employeeId ? `(${emp.employeeId})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/expenses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Expenses
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create {expenseType} Expense
          </h1>
          <p className="text-gray-600 mt-1">
            Step {currentStep} of 5
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-2">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded ${
              step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        {currentStep < 5 ? (
          <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Expense'}
          </Button>
        )}
      </div>
    </div>
  );
}

