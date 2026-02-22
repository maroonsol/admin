"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { indianStates, hsnSacCodes, currencies } from "@/lib/data";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { validateGSTNumber } from "@/lib/utils";

type InvoiceType = "B2B" | "B2C" | "EXPORT" | null;

interface BusinessInfo {
  id: string;
  businessName: string;
  gstNumber: string;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessAddress?: string | null;
  businessAddress2?: string | null;
  businessDistrict?: string | null;
  businessState?: string | null;
  businessStateCode?: string | null;
  businessPincode?: string | null;
}

interface InvoiceItem {
  id?: string;
  hsnSac: string;
  description: string;
  qty: number;
  rate: number;
  taxableAmount: number;
  gstRate: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<InvoiceType>(null);
  const [invoiceData, setInvoiceData] = useState({
    // Customer details
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerAddress2: "",
    customerDistrict: "",
    customerState: "",
    customerPincode: "",
    customerGst: "",
    
    // Invoice details
    invoiceDate: new Date().toISOString().split('T')[0],
    currency: "INR",
    exchangeRate: 1,
    lutNumber: "",
    
    // Financial details
    totalPaid: 0,
    discount: 0,
  });

  // B2B specific states
  const [gstValidated, setGstValidated] = useState(false);
  const [gstError, setGstError] = useState("");
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(false);
  const [businessInfoLoaded, setBusinessInfoLoaded] = useState(false);
  const [originalBusinessInfo, setOriginalBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Reset B2B-specific states when invoice type changes
  useEffect(() => {
    if (selectedType !== "B2B") {
      setGstValidated(false);
      setGstError("");
      setBusinessInfoLoaded(false);
      setOriginalBusinessInfo(null);
      setLoadingBusinessInfo(false);
      setBusinessId(null);
    }
  }, [selectedType]);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      hsnSac: "",
      description: "",
      qty: 1,
      rate: 0,
      taxableAmount: 0,
      gstRate: 0,
      igstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      totalAmount: 0,
    }
  ]);

  // Load invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invoice');
        }
        const invoice = await response.json();
        
        // Set invoice type
        setSelectedType(invoice.invoiceType);
        
        // Set business ID if exists
        if (invoice.businessId) {
          setBusinessId(invoice.businessId);
        }
        
        // Set invoice data - use business info if available, otherwise use customer details
        const business = invoice.business;
        setInvoiceData({
          customerName: business?.businessName || invoice.customerName || "",
          customerPhone: business?.businessPhone || invoice.customerPhone || "",
          customerEmail: business?.businessEmail || invoice.customerEmail || "",
          customerAddress: business?.businessAddress || invoice.customerAddress || "",
          customerAddress2: business?.businessAddress2 || invoice.customerAddress2 || "",
          customerDistrict: business?.businessDistrict || invoice.customerDistrict || "",
          customerState: business?.businessState || invoice.customerState || "",
          customerPincode: business?.businessPincode || invoice.customerPincode || "",
          customerGst: business?.gstNumber || invoice.customerGst || "",
          invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
          currency: invoice.currency || "INR",
          exchangeRate: invoice.exchangeRate || 1,
          lutNumber: invoice.lutNumber || "",
          totalPaid: invoice.totalPaid || 0,
          discount: invoice.discount || 0,
        });

        // Set items
        if (invoice.items && invoice.items.length > 0) {
          setItems(invoice.items.map((item: InvoiceItem, index: number) => ({
            id: item.id || (index + 1).toString(),
            hsnSac: item.hsnSac || "",
            description: item.description || "",
            qty: item.qty || 0,
            rate: item.rate || 0,
            taxableAmount: item.taxableAmount || 0,
            gstRate: item.gstRate || 0,
            igstAmount: item.igstAmount || 0,
            cgstAmount: item.cgstAmount || 0,
            sgstAmount: item.sgstAmount || 0,
            totalAmount: item.totalAmount || 0,
          })));
        }

        // If B2B, validate GST and set business info
        if (invoice.invoiceType === "B2B") {
          if (business) {
            setOriginalBusinessInfo(business);
            setGstValidated(true);
            setBusinessInfoLoaded(true);
          } else if (invoice.customerGst) {
            setGstValidated(true);
            setBusinessInfoLoaded(true);
          }
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        alert('Failed to load invoice. Redirecting...');
        router.push('/invoices');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, router]);

  const handleInputChange = (field: string, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle GST number input and validation for B2B
  const handleGSTInput = async (gst: string) => {
    setInvoiceData(prev => ({ ...prev, customerGst: gst }));
    setGstError("");
    setGstValidated(false);
    setBusinessInfoLoaded(false);

    if (!gst || gst.trim() === "") {
      return;
    }

    // Validate GST format
    if (!validateGSTNumber(gst)) {
      setGstError("Invalid GST number format. Please enter a valid 15-character GST number.");
      return;
    }

    setGstValidated(true);
    setLoadingBusinessInfo(true);

    try {
      // Search for business info
      const response = await fetch(`/api/business-info?gstNumber=${encodeURIComponent(gst)}`);
      
      if (response.ok) {
        const businessInfo = await response.json();
        // Store business ID
        setBusinessId(businessInfo.id);
        // Pre-fill business info
        setInvoiceData(prev => ({
          ...prev,
          customerName: businessInfo.businessName || prev.customerName,
          customerPhone: businessInfo.businessPhone || prev.customerPhone,
          customerEmail: businessInfo.businessEmail || prev.customerEmail,
          customerAddress: businessInfo.businessAddress || prev.customerAddress,
          customerAddress2: businessInfo.businessAddress2 || prev.customerAddress2,
          customerDistrict: businessInfo.businessDistrict || prev.customerDistrict,
          customerState: businessInfo.businessState || prev.customerState,
          customerPincode: businessInfo.businessPincode || prev.customerPincode,
        }));
        setOriginalBusinessInfo(businessInfo);
        setBusinessInfoLoaded(true);
      } else if (response.status === 404) {
        // Business info not found - keep existing data
        setBusinessInfoLoaded(true);
        setOriginalBusinessInfo(null);
        setBusinessId(null);
      } else {
        throw new Error("Failed to fetch business info");
      }
    } catch (error) {
      console.error("Error fetching business info:", error);
      setGstError("Failed to fetch business info. Please try again.");
      setGstValidated(false);
    } finally {
      setLoadingBusinessInfo(false);
    }
  };

  // Check if business info has changed
  const hasBusinessInfoChanged = () => {
    if (!originalBusinessInfo) {
      // New business info - check if any field is filled
      return invoiceData.customerName.trim() !== "" ||
             invoiceData.customerPhone.trim() !== "" ||
             invoiceData.customerEmail.trim() !== "";
    }

    // Compare with original
    return originalBusinessInfo.businessName !== invoiceData.customerName ||
           originalBusinessInfo.businessPhone !== invoiceData.customerPhone ||
           originalBusinessInfo.businessEmail !== invoiceData.customerEmail ||
           originalBusinessInfo.businessAddress !== invoiceData.customerAddress ||
           originalBusinessInfo.businessAddress2 !== invoiceData.customerAddress2 ||
           originalBusinessInfo.businessDistrict !== invoiceData.customerDistrict ||
           originalBusinessInfo.businessState !== invoiceData.customerState ||
           originalBusinessInfo.businessPincode !== invoiceData.customerPincode;
  };

  const handleItemChange = (itemId: string, field: string, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate amounts when relevant fields change
        if (field === 'qty' || field === 'rate') {
          updatedItem.taxableAmount = updatedItem.qty * updatedItem.rate;
        }
        
        if (field === 'hsnSac') {
          const hsnData = hsnSacCodes.find(h => h.code === value);
          if (hsnData) {
            updatedItem.description = hsnData.description;
            updatedItem.gstRate = hsnData.igst;
          }
        }
        
        // Calculate tax amounts
        if (updatedItem.taxableAmount > 0 && updatedItem.gstRate > 0) {
          const taxAmount = (updatedItem.taxableAmount * updatedItem.gstRate) / 100;
          
          if (invoiceData.customerState === "Bihar") {
            updatedItem.igstAmount = 0;
            updatedItem.cgstAmount = taxAmount / 2;
            updatedItem.sgstAmount = taxAmount / 2;
          } else {
            updatedItem.igstAmount = taxAmount;
            updatedItem.cgstAmount = 0;
            updatedItem.sgstAmount = 0;
          }
          
          updatedItem.totalAmount = updatedItem.taxableAmount + taxAmount;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      hsnSac: "",
      description: "",
      qty: 1,
      rate: 0,
      taxableAmount: 0,
      gstRate: 0,
      igstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      totalAmount: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);
    const totalTax = items.reduce((sum, item) => sum + (item.igstAmount + item.cgstAmount + item.sgstAmount), 0);
    const grandTotal = subtotal + totalTax - (invoiceData.discount || 0);
    const roundedAmount = Math.round(grandTotal);
    const roundedDifference = roundedAmount - grandTotal;
    const balanceAmount = roundedAmount - (invoiceData.totalPaid || 0);
    
    return { subtotal, totalTax, grandTotal, roundedAmount, roundedDifference, balanceAmount };
  };

  const { subtotal, totalTax, grandTotal, roundedAmount, roundedDifference, balanceAmount } = calculateTotals();

  const handleUpdateInvoice = async () => {
    try {
      // Validate required fields
      if (!invoiceData.customerName || !invoiceData.customerPhone || !invoiceData.customerEmail) {
        alert("Please fill in all required customer details");
        return;
      }
      
      if (selectedType === "B2B") {
        if (!invoiceData.customerGst) {
          alert("GST number is required for B2B invoices");
          return;
        }
        if (!gstValidated) {
          alert("Please enter and validate GST number first");
          return;
        }
        
        // Save or update business info
        if (hasBusinessInfoChanged()) {
          const stateCode = indianStates.find(s => s.name === invoiceData.customerState)?.code || "";
          
          const businessInfoPayload = {
            gstNumber: invoiceData.customerGst,
            businessName: invoiceData.customerName,
            businessPhone: invoiceData.customerPhone,
            businessEmail: invoiceData.customerEmail,
            businessAddress: invoiceData.customerAddress,
            businessAddress2: invoiceData.customerAddress2,
            businessDistrict: invoiceData.customerDistrict,
            businessState: invoiceData.customerState,
            businessStateCode: stateCode,
            businessPincode: invoiceData.customerPincode,
          };

          const businessInfoResponse = await fetch('/api/business-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(businessInfoPayload),
          });

          if (!businessInfoResponse.ok) {
            throw new Error('Failed to save business info');
          }
          
          // Store the business ID from response
          const savedBusinessInfo = await businessInfoResponse.json();
          setBusinessId(savedBusinessInfo.id);
        }
      }
      
      if (items.some(item => !item.hsnSac || !item.description || item.qty <= 0 || item.rate <= 0)) {
        alert("Please fill in all item details correctly");
        return;
      }
      
      // Prepare invoice data
      interface InvoicePayload {
        invoiceType: 'B2B' | 'B2C' | 'EXPORT';
        invoiceDate: string;
        isExport: boolean;
        currency: string;
        exchangeRate: number;
        lutNumber?: string;
        businessId?: string;
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        customerAddress?: string;
        customerAddress2?: string;
        customerDistrict?: string;
        customerState?: string;
        customerPincode?: string;
        customerGst?: string;
        subtotal: number;
        totalTax: number;
        discount: number;
        totalPaid: number;
        grandTotal: number;
        roundedAmount: number;
        roundedDifference: number;
        balanceAmount: number;
        items: InvoiceItem[];
      }
      const invoicePayload: InvoicePayload = {
        invoiceType: selectedType!,
        invoiceDate: invoiceData.invoiceDate,
        isExport: selectedType === "EXPORT",
        currency: invoiceData.currency,
        exchangeRate: invoiceData.exchangeRate,
        lutNumber: invoiceData.lutNumber,
        
        // Financial details
        subtotal,
        totalTax,
        discount: invoiceData.discount || 0,
        totalPaid: invoiceData.totalPaid || 0,
        grandTotal,
        roundedAmount,
        roundedDifference,
        balanceAmount,
        
        items: items.map(item => ({
          hsnSac: item.hsnSac,
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          taxableAmount: item.taxableAmount,
          gstRate: item.gstRate,
          igstAmount: item.igstAmount,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          totalAmount: item.totalAmount,
        }))
      };
      
      // For B2B invoices, use businessId; for others, use customer details
      if (selectedType === "B2B" && businessId) {
        invoicePayload.businessId = businessId;
      } else {
        invoicePayload.customerName = invoiceData.customerName;
        invoicePayload.customerPhone = invoiceData.customerPhone;
        invoicePayload.customerEmail = invoiceData.customerEmail;
        invoicePayload.customerAddress = invoiceData.customerAddress;
        invoicePayload.customerAddress2 = invoiceData.customerAddress2;
        invoicePayload.customerDistrict = invoiceData.customerDistrict;
        invoicePayload.customerState = invoiceData.customerState;
        invoicePayload.customerPincode = invoiceData.customerPincode;
        invoicePayload.customerGst = invoiceData.customerGst;
      }
      
      // Update invoice in database
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }
      
      await response.json();
      
      // Show success message
      alert('Invoice updated successfully!');
      
      // Redirect to invoices page
      router.push('/invoices');
      
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedType) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit {selectedType} Invoice
            </h1>
            <p className="text-gray-600 mt-1">
              Update the invoice details below
            </p>
          </div>
        </div>
        <Button 
          onClick={handleUpdateInvoice}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Update Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedType === "EXPORT" ? "Recipient Details" : 
               selectedType === "B2B" ? "Business Details" : "Customer Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedType === "B2B" && (
              <div>
                <Label htmlFor="customerGst">GST Number *</Label>
                <Input
                  id="customerGst"
                  value={invoiceData.customerGst}
                  onChange={(e) => handleGSTInput(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value && !gstValidated) {
                      handleGSTInput(e.target.value);
                    }
                  }}
                  placeholder="Enter GST number (15 characters)"
                  disabled={gstValidated}
                  className={gstError ? "border-red-500" : ""}
                />
                {loadingBusinessInfo && (
                  <p className="text-sm text-gray-500 mt-1">Searching for business info...</p>
                )}
                {gstError && (
                  <p className="text-sm text-red-500 mt-1">{gstError}</p>
                )}
                {gstValidated && !loadingBusinessInfo && (
                  <p className="text-sm text-green-600 mt-1">✓ GST number validated</p>
                )}
              </div>
            )}

            {(selectedType !== "B2B" || (selectedType === "B2B" && businessInfoLoaded)) && (
              <>
                <div>
                  <Label htmlFor="customerName">
                    {selectedType === "B2B" ? "Business Name" : "Name"} *
                  </Label>
                  <Input
                    id="customerName"
                    value={invoiceData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder={selectedType === "B2B" ? "Enter business name" : "Enter customer name"}
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">
                    {selectedType === "B2B" ? "Business Phone" : "Phone Number"} *
                  </Label>
                  <Input
                    id="customerPhone"
                    value={invoiceData.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="customerEmail">
                    {selectedType === "B2B" ? "Business Email" : "Email"} *
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={invoiceData.customerEmail}
                    onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </>
            )}

            {(selectedType !== "B2B" || (selectedType === "B2B" && businessInfoLoaded)) && (
              <>
                <div>
                  <Label htmlFor="customerAddress">Address Line 1 *</Label>
                  <Textarea
                    id="customerAddress"
                    value={invoiceData.customerAddress}
                    onChange={(e) => handleInputChange("customerAddress", e.target.value)}
                    placeholder="Enter address"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="customerAddress2">Address Line 2 (Optional)</Label>
                  <Textarea
                    id="customerAddress2"
                    value={invoiceData.customerAddress2}
                    onChange={(e) => handleInputChange("customerAddress2", e.target.value)}
                    placeholder="Enter additional address details"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerDistrict">District</Label>
                    <Input
                      id="customerDistrict"
                      value={invoiceData.customerDistrict}
                      onChange={(e) => handleInputChange("customerDistrict", e.target.value)}
                      placeholder="Enter district"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPincode">Pincode</Label>
                    <Input
                      id="customerPincode"
                      value={invoiceData.customerPincode}
                      onChange={(e) => handleInputChange("customerPincode", e.target.value)}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                {selectedType !== "EXPORT" && (
                  <div>
                    <Label htmlFor="customerState">State *</Label>
                    <Select
                      value={invoiceData.customerState}
                      onValueChange={(value: string) => handleInputChange("customerState", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map((state) => (
                          <SelectItem key={state.code} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {selectedType === "EXPORT" && (
              <>
                <div>
                  <Label htmlFor="currency">Currency of Transaction *</Label>
                  <Select
                    value={invoiceData.currency}
                    onValueChange={(value: string) => handleInputChange("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exchangeRate">Exchange Rate</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.01"
                    value={invoiceData.exchangeRate}
                    onChange={(e) => handleInputChange("exchangeRate", parseFloat(e.target.value) || 1)}
                    placeholder="Enter exchange rate"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceData.invoiceDate}
                onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
              />
            </div>

            {selectedType === "EXPORT" && (
              <div>
                <Label htmlFor="lutNumber">LUT Number</Label>
                <Input
                  id="lutNumber"
                  value={invoiceData.lutNumber}
                  onChange={(e) => handleInputChange("lutNumber", e.target.value)}
                  placeholder="Enter LUT number"
                />
              </div>
            )}

            <div>
              <Label htmlFor="totalPaid">Total Paid Amount</Label>
              <Input
                id="totalPaid"
                type="number"
                step="0.01"
                value={invoiceData.totalPaid}
                onChange={(e) => handleInputChange("totalPaid", parseFloat(e.target.value) || 0)}
                placeholder="Enter paid amount"
              />
            </div>

            <div>
              <Label htmlFor="discount">Discount (if any)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={invoiceData.discount}
                onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                placeholder="Enter discount amount"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Invoice Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id || index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {items.length > 1 && item.id && (
                    <Button
                      onClick={() => removeItem(item.id!)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>HSN/SAC Code *</Label>
                    <Select
                      value={item.hsnSac}
                      onValueChange={(value: string) => item.id && handleItemChange(item.id, "hsnSac", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select HSN/SAC" />
                      </SelectTrigger>
                      <SelectContent>
                        {hsnSacCodes.map((hsn) => (
                          <SelectItem key={hsn.code} value={hsn.code}>
                            {hsn.code} - {hsn.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => item.id && handleItemChange(item.id, "description", e.target.value)}
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => item.id && handleItemChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <Label>Rate *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => item.id && handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                      placeholder="Enter rate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label>Taxable Amount</Label>
                    <div className="p-2 bg-gray-50 rounded">
                      {selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{item.taxableAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  {invoiceData.customerState === "Bihar" ? (
                    <>
                      <div>
                        <Label>CGST ({item.gstRate/2}%)</Label>
                        <div className="p-2 bg-gray-50 rounded">
                          {selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{item.cgstAmount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <Label>SGST ({item.gstRate/2}%)</Label>
                        <div className="p-2 bg-gray-50 rounded">
                          {selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{item.sgstAmount.toFixed(2)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label>IGST ({item.gstRate}%)</Label>
                      <div className="p-2 bg-gray-50 rounded">
                        {selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{item.igstAmount.toFixed(2)}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label>Total</Label>
                    <div className="p-2 bg-blue-50 rounded font-medium">
                      {selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{item.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tax:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{(invoiceData.discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{grandTotal.toFixed(2)}</span>
              </div>
              {roundedDifference !== 0 && (
                <div className="flex justify-between">
                  <span>Rounding Off:</span>
                  <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{roundedDifference > 0 ? '+' : ''}{roundedDifference.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Rounded Amount:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{roundedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{(invoiceData.totalPaid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-blue-600">
                <span>Balance Amount:</span>
                <span>{selectedType === "EXPORT" ? `${invoiceData.currency} ` : "₹"}{balanceAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

