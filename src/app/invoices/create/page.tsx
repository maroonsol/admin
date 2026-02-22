"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { indianStates, hsnSacCodes, currencies } from "@/lib/data";
import { ArrowLeft, Plus, Trash2, Download } from "lucide-react";
import Link from "next/link";

interface InvoiceItem {
  id: string;
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

export default function CreateInvoicePage() {
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
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
  const [businessSearchResults, setBusinessSearchResults] = useState<BusinessInfo[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  
  // Invoice number preview
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState<string>("");

  // Reset B2B-specific states when invoice type changes
  useEffect(() => {
    if (selectedType !== "B2B") {
      setGstValidated(false);
      setGstError("");
      setBusinessInfoLoaded(false);
      setOriginalBusinessInfo(null);
      setLoadingBusinessInfo(false);
      setBusinessId(null);
      setBusinessSearchTerm("");
      setBusinessSearchResults([]);
      setShowBusinessDropdown(false);
      setSelectedBusiness(null);
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

  const handleInputChange = (field: string, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle business search
  const handleBusinessSearch = async (searchTerm: string) => {
    setBusinessSearchTerm(searchTerm);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      setBusinessSearchResults([]);
      setShowBusinessDropdown(false);
      return;
    }

    setLoadingBusinessInfo(true);
    try {
      const response = await fetch(`/api/business-info?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const results = await response.json();
        setBusinessSearchResults(results);
        setShowBusinessDropdown(true);
      } else {
        setBusinessSearchResults([]);
        setShowBusinessDropdown(false);
      }
    } catch (error) {
      console.error("Error searching businesses:", error);
      setBusinessSearchResults([]);
      setShowBusinessDropdown(false);
    } finally {
      setLoadingBusinessInfo(false);
    }
  };

  // Handle business selection
  const handleBusinessSelect = (business: BusinessInfo) => {
    setSelectedBusiness(business);
    setBusinessId(business.id);
    setBusinessSearchTerm(business.businessName);
    setShowBusinessDropdown(false);
    setGstValidated(true);
    setBusinessInfoLoaded(true);
    setOriginalBusinessInfo(business);
    setGstError("");
    
    // Pre-fill business info
    setInvoiceData(prev => ({
      ...prev,
      customerGst: business.gstNumber || "",
      customerName: business.businessName || "",
      customerPhone: business.businessPhone || "",
      customerEmail: business.businessEmail || "",
      customerAddress: business.businessAddress || "",
      customerAddress2: business.businessAddress2 || "",
      customerDistrict: business.businessDistrict || "",
      customerState: business.businessState || "",
      customerPincode: business.businessPincode || "",
    }));
  };

  // Handle clearing business selection
  const handleClearBusiness = () => {
    setSelectedBusiness(null);
    setBusinessId(null);
    setBusinessSearchTerm("");
    setBusinessSearchResults([]);
    setShowBusinessDropdown(false);
    setGstValidated(false);
    setBusinessInfoLoaded(false);
    setOriginalBusinessInfo(null);
    setInvoiceData(prev => ({
      ...prev,
      customerGst: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerAddress2: "",
      customerDistrict: "",
      customerState: "",
      customerPincode: "",
    }));
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

  const handleCreateInvoice = async () => {
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
        items: Array<{
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
        }>;
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
        
        items
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
      
      // Create invoice in database
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }
      
      const createdInvoice = await response.json();
      
      // Download PDF via API endpoint
      const pdfResponse = await fetch(`/api/invoices/${createdInvoice.id}/pdf`);
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${createdInvoice.invoiceNumber.replace('/', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      // Show success message
      alert('Invoice created and PDF downloaded successfully!');
      
      // Reset form
      setSelectedType(null);
      setInvoiceData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        customerAddress2: "",
        customerDistrict: "",
        customerState: "",
        customerPincode: "",
        customerGst: "",
        invoiceDate: new Date().toISOString().split('T')[0],
        currency: "INR",
        exchangeRate: 1,
        lutNumber: "",
        totalPaid: 0,
        discount: 0,
      });
      setGstValidated(false);
      setGstError("");
      setBusinessInfoLoaded(false);
      setOriginalBusinessInfo(null);
      setBusinessId(null);
      setItems([{
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
      }]);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  if (!selectedType) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
            <p className="text-gray-600 mt-1">Choose the type of invoice you want to create</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => setSelectedType("B2B")}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🏢</div>
              <CardTitle className="text-xl">B2B Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Business to Business invoice with GST details for registered businesses
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
            onClick={() => setSelectedType("B2C")}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">👤</div>
              <CardTitle className="text-xl">B2C Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Business to Consumer invoice for individual customers
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500"
            onClick={() => setSelectedType("EXPORT")}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🌍</div>
              <CardTitle className="text-xl">Export Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Export invoice for international customers with zero GST
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedType(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create {selectedType} Invoice
            </h1>
            <p className="text-gray-600 mt-1">
              Fill in the details to create your invoice
            </p>
            {invoiceNumberPreview && (
              <p className="text-sm font-semibold text-blue-600 mt-2">
                Invoice Number: {invoiceNumberPreview}
              </p>
            )}
          </div>
        </div>
        <Button 
          onClick={handleCreateInvoice}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Create & Download Invoice
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
              <div className="relative business-search-container">
                <Label htmlFor="businessSearch">Search Business (Name or GST) *</Label>
                <div className="relative">
                  <Input
                    id="businessSearch"
                    value={businessSearchTerm}
                    onChange={(e) => handleBusinessSearch(e.target.value)}
                    onFocus={() => {
                      if (businessSearchTerm.length >= 2) {
                        setShowBusinessDropdown(true);
                      }
                    }}
                    placeholder="Type business name or GST number to search..."
                    className={gstError ? "border-red-500" : ""}
                  />
                  {selectedBusiness && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearBusiness}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
                {loadingBusinessInfo && (
                  <p className="text-sm text-gray-500 mt-1">Searching...</p>
                )}
                {gstError && (
                  <p className="text-sm text-red-500 mt-1">{gstError}</p>
                )}
                {selectedBusiness && !loadingBusinessInfo && (
                  <p className="text-sm text-green-600 mt-1">✓ Business selected: {selectedBusiness.businessName}</p>
                )}
                {showBusinessDropdown && businessSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {businessSearchResults.map((business) => (
                      <div
                        key={business.id}
                        onClick={() => handleBusinessSelect(business)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      >
                        <div className="font-medium">{business.businessName}</div>
                        <div className="text-sm text-gray-600">GST: {business.gstNumber}</div>
                        {business.businessState && (
                          <div className="text-xs text-gray-500">{business.businessState}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showBusinessDropdown && businessSearchResults.length === 0 && businessSearchTerm.length >= 2 && !loadingBusinessInfo && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                    No businesses found
                  </div>
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
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="Enter country name"
                  />
                </div>
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
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      onClick={() => removeItem(item.id)}
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
                      onValueChange={(value: string) => handleItemChange(item.id, "hsnSac", value)}
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
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <Label>Rate *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
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
