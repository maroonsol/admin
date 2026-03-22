"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { indianStates, hsnSacCodes, currencies } from "@/lib/data";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { validateGSTNumber } from "@/lib/utils";

import { SERVICE_TYPE_LABELS, gstServiceCodeLabel } from "@/lib/service-codes";

interface ServiceOption {
  id: string;
  businessId: string;
  serviceType: string;
  serviceCode?: string | null;
  domainName: string | null;
  serverIp: string | null;
  emailName: string | null;
  startDate: string;
  endDate: string;
  planCode: string | null;
}

type InvoiceType = "B2B" | "B2C" | "EXPORT" | null;

interface BusinessAdditionalGst {
  id: string;
  gstNumber: string;
  businessAddress?: string | null;
  businessAddress2?: string | null;
  businessDistrict?: string | null;
  businessState?: string | null;
  businessStateCode?: string | null;
  businessPincode?: string | null;
}

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
  multipleGst?: boolean;
  additionalGstLocations?: BusinessAdditionalGst[];
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
    customerStateCode: "",
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
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  const [selectedGstLocationKey, setSelectedGstLocationKey] = useState<
    null | "primary" | string
  >(null);

  // Services period (B2B only)
  const [includesServicesPeriod, setIncludesServicesPeriod] = useState(false);
  const [businessServices, setBusinessServices] = useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Reset B2B-specific states when invoice type changes
  useEffect(() => {
    if (selectedType !== "B2B") {
      setGstValidated(false);
      setGstError("");
      setBusinessInfoLoaded(false);
      setOriginalBusinessInfo(null);
      setLoadingBusinessInfo(false);
      setBusinessId(null);
      setSelectedBusiness(null);
      setSelectedGstLocationKey(null);
      setIncludesServicesPeriod(false);
      setBusinessServices([]);
      setSelectedServiceIds([]);
    }
  }, [selectedType]);

  // Fetch services for selected business when "includes services period" is on
  useEffect(() => {
    if (!includesServicesPeriod || !businessId) {
      setBusinessServices([]);
      if (!includesServicesPeriod) setSelectedServiceIds([]);
      return;
    }
    let cancelled = false;
    setLoadingServices(true);
    fetch(`/api/services?businessId=${encodeURIComponent(businessId)}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: ServiceOption[]) => {
        if (!cancelled) setBusinessServices(data);
      })
      .catch(() => { if (!cancelled) setBusinessServices([]); })
      .finally(() => { if (!cancelled) setLoadingServices(false); });
    return () => { cancelled = true; };
  }, [includesServicesPeriod, businessId]);

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
        const inv = invoice as typeof invoice & {
          differentGst?: boolean;
          businessAdditionalGstId?: string | null;
          customerStateCode?: string | null;
        };

        // Set invoice type
        setSelectedType(invoice.invoiceType);

        if (invoice.businessId) {
          setBusinessId(invoice.businessId);
        }

        const business = invoice.business as BusinessInfo | null | undefined;
        let fullBusiness: BusinessInfo | null = business ?? null;
        if (invoice.businessId) {
          try {
            const br = await fetch(
              `/api/business-info?id=${encodeURIComponent(invoice.businessId)}`
            );
            if (br.ok) {
              fullBusiness = await br.json();
            }
          } catch {
            /* keep invoice.business */
          }
        }
        setSelectedBusiness(fullBusiness);

        const b2bDifferent =
          inv.invoiceType === "B2B" && Boolean(inv.differentGst);

        setInvoiceData({
          customerName: business?.businessName || inv.customerName || "",
          customerPhone: business?.businessPhone || inv.customerPhone || "",
          customerEmail: business?.businessEmail || inv.customerEmail || "",
          customerAddress: b2bDifferent
            ? inv.customerAddress || ""
            : business?.businessAddress || inv.customerAddress || "",
          customerAddress2: b2bDifferent
            ? inv.customerAddress2 || ""
            : business?.businessAddress2 || inv.customerAddress2 || "",
          customerDistrict: b2bDifferent
            ? inv.customerDistrict || ""
            : business?.businessDistrict || inv.customerDistrict || "",
          customerState: b2bDifferent
            ? inv.customerState || ""
            : business?.businessState || inv.customerState || "",
          customerStateCode: b2bDifferent
            ? inv.customerStateCode || ""
            : business?.businessStateCode || inv.customerStateCode || "",
          customerPincode: b2bDifferent
            ? inv.customerPincode || ""
            : business?.businessPincode || inv.customerPincode || "",
          customerGst: b2bDifferent
            ? inv.customerGst || ""
            : business?.gstNumber || inv.customerGst || "",
          invoiceDate: new Date(invoice.invoiceDate).toISOString().split("T")[0],
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

        if (invoice.invoiceType === "B2B") {
          if (fullBusiness) {
            setOriginalBusinessInfo(fullBusiness);
            setGstValidated(true);
            const multi =
              fullBusiness.multipleGst &&
              (fullBusiness.additionalGstLocations?.length ?? 0) > 0;
            if (multi) {
              if (inv.differentGst && inv.businessAdditionalGstId) {
                setSelectedGstLocationKey(inv.businessAdditionalGstId);
              } else {
                setSelectedGstLocationKey("primary");
              }
            } else {
              setSelectedGstLocationKey("primary");
            }
            setBusinessInfoLoaded(true);
          } else if (invoice.customerGst) {
            setGstValidated(true);
            setBusinessInfoLoaded(true);
            setSelectedGstLocationKey(null);
          }
        }

        // Services period: if invoice has linked services, set switch and selected IDs
        const linkedServices = (invoice as { services?: Array<{ id: string }> }).services;
        if (linkedServices && linkedServices.length > 0) {
          setIncludesServicesPeriod(true);
          setSelectedServiceIds(linkedServices.map((s) => s.id));
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
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setCustomerState = (stateName: string) => {
    const code = indianStates.find((s) => s.name === stateName)?.code || "";
    setInvoiceData((prev) => ({
      ...prev,
      customerState: stateName,
      customerStateCode: code,
    }));
  };

  const applyPrimaryBilling = (biz: BusinessInfo) => {
    setInvoiceData((prev) => ({
      ...prev,
      customerGst: biz.gstNumber || "",
      customerName: biz.businessName || "",
      customerPhone: biz.businessPhone || "",
      customerEmail: biz.businessEmail || "",
      customerAddress: biz.businessAddress || "",
      customerAddress2: biz.businessAddress2 || "",
      customerDistrict: biz.businessDistrict || "",
      customerState: biz.businessState || "",
      customerStateCode: biz.businessStateCode || "",
      customerPincode: biz.businessPincode || "",
    }));
  };

  const applyAdditionalBilling = (biz: BusinessInfo, row: BusinessAdditionalGst) => {
    setInvoiceData((prev) => ({
      ...prev,
      customerGst: row.gstNumber || "",
      customerName: biz.businessName || "",
      customerPhone: biz.businessPhone || "",
      customerEmail: biz.businessEmail || "",
      customerAddress: row.businessAddress || "",
      customerAddress2: row.businessAddress2 || "",
      customerDistrict: row.businessDistrict || "",
      customerState: row.businessState || "",
      customerStateCode: row.businessStateCode || "",
      customerPincode: row.businessPincode || "",
    }));
  };

  const onBillingGstLocationChange = (value: string) => {
    if (!selectedBusiness) return;
    if (value === "primary") {
      applyPrimaryBilling(selectedBusiness);
      setSelectedGstLocationKey("primary");
    } else {
      const row = selectedBusiness.additionalGstLocations?.find((r) => r.id === value);
      if (row) applyAdditionalBilling(selectedBusiness, row);
      setSelectedGstLocationKey(value);
    }
    setBusinessInfoLoaded(true);
    setGstValidated(true);
  };

  const persistBusinessMasterFromForm = async () => {
    if (!selectedBusiness || selectedType !== "B2B") return;
    const additionalGstLocations = (selectedBusiness.additionalGstLocations ?? []).map((r) => {
      if (selectedGstLocationKey !== "primary" && r.id === selectedGstLocationKey) {
        return {
          gstNumber: r.gstNumber,
          businessAddress: invoiceData.customerAddress,
          businessAddress2: invoiceData.customerAddress2,
          businessDistrict: invoiceData.customerDistrict,
          businessState: invoiceData.customerState,
          businessStateCode:
            invoiceData.customerStateCode ||
            indianStates.find((s) => s.name === invoiceData.customerState)?.code ||
            "",
          businessPincode: invoiceData.customerPincode,
        };
      }
      return {
        gstNumber: r.gstNumber,
        businessAddress: r.businessAddress ?? "",
        businessAddress2: r.businessAddress2 ?? "",
        businessDistrict: r.businessDistrict ?? "",
        businessState: r.businessState ?? "",
        businessStateCode: r.businessStateCode ?? "",
        businessPincode: r.businessPincode ?? "",
      };
    });

    const res = await fetch("/api/business-info", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedBusiness.id,
        gstNumber: selectedBusiness.gstNumber,
        businessName: invoiceData.customerName,
        businessPhone: invoiceData.customerPhone,
        businessEmail: invoiceData.customerEmail,
        ...(selectedGstLocationKey === "primary"
          ? {
              businessAddress: invoiceData.customerAddress,
              businessAddress2: invoiceData.customerAddress2,
              businessDistrict: invoiceData.customerDistrict,
              businessState: invoiceData.customerState,
              businessStateCode:
                invoiceData.customerStateCode ||
                indianStates.find((s) => s.name === invoiceData.customerState)?.code ||
                "",
              businessPincode: invoiceData.customerPincode,
            }
          : {
              businessAddress: selectedBusiness.businessAddress ?? "",
              businessAddress2: selectedBusiness.businessAddress2 ?? "",
              businessDistrict: selectedBusiness.businessDistrict ?? "",
              businessState: selectedBusiness.businessState ?? "",
              businessStateCode: selectedBusiness.businessStateCode ?? "",
              businessPincode: selectedBusiness.businessPincode ?? "",
            }),
        multipleGst: selectedBusiness.multipleGst ?? false,
        additionalGstLocations,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update business master record");
    }
    const updated = await res.json();
    setSelectedBusiness(updated);
    setOriginalBusinessInfo(updated);
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

    setLoadingBusinessInfo(true);

    try {
      const response = await fetch(`/api/business-info?gstNumber=${encodeURIComponent(gst)}`);

      if (response.ok) {
        const businessInfo = (await response.json()) as BusinessInfo;
        setBusinessId(businessInfo.id);
        setSelectedBusiness(businessInfo);
        setOriginalBusinessInfo(businessInfo);
        const multi =
          businessInfo.multipleGst &&
          (businessInfo.additionalGstLocations?.length ?? 0) > 0;
        if (multi) {
          setSelectedGstLocationKey(null);
          setGstValidated(false);
          setBusinessInfoLoaded(false);
          setInvoiceData((prev) => ({
            ...prev,
            customerGst: "",
            customerName: businessInfo.businessName || prev.customerName,
            customerPhone: businessInfo.businessPhone || prev.customerPhone,
            customerEmail: businessInfo.businessEmail || prev.customerEmail,
            customerAddress: "",
            customerAddress2: "",
            customerDistrict: "",
            customerState: "",
            customerStateCode: "",
            customerPincode: "",
          }));
        } else {
          setSelectedGstLocationKey("primary");
          setGstValidated(true);
          setBusinessInfoLoaded(true);
          setInvoiceData((prev) => ({
            ...prev,
            customerName: businessInfo.businessName || prev.customerName,
            customerPhone: businessInfo.businessPhone || prev.customerPhone,
            customerEmail: businessInfo.businessEmail || prev.customerEmail,
            customerAddress: businessInfo.businessAddress || prev.customerAddress,
            customerAddress2: businessInfo.businessAddress2 || prev.customerAddress2,
            customerDistrict: businessInfo.businessDistrict || prev.customerDistrict,
            customerState: businessInfo.businessState || prev.customerState,
            customerStateCode: businessInfo.businessStateCode || prev.customerStateCode,
            customerPincode: businessInfo.businessPincode || prev.customerPincode,
            customerGst: businessInfo.gstNumber || prev.customerGst,
          }));
        }
      } else if (response.status === 404) {
        setBusinessInfoLoaded(true);
        setOriginalBusinessInfo(null);
        setBusinessId(null);
        setSelectedBusiness(null);
        setSelectedGstLocationKey(null);
        setGstValidated(true);
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
        if (!businessId) {
          alert("Business link is missing for this B2B invoice");
          return;
        }
        if (!invoiceData.customerGst) {
          alert("GST number is required for B2B invoices");
          return;
        }
        if (!gstValidated) {
          alert("Please validate GST / select billing registration first");
          return;
        }
        const multi =
          selectedBusiness?.multipleGst &&
          (selectedBusiness.additionalGstLocations?.length ?? 0) > 0;
        if (multi && selectedGstLocationKey === null) {
          alert("Please select which GST registration to use for this invoice");
          return;
        }

        if (businessId && selectedBusiness) {
          await persistBusinessMasterFromForm();
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
        customerStateCode?: string;
        customerPincode?: string;
        customerGst?: string;
        differentGst?: boolean;
        businessAdditionalGstId?: string | null;
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
      
      if (selectedType === "B2B" && businessId) {
        invoicePayload.businessId = businessId;
        const useDifferent =
          selectedGstLocationKey !== null &&
          selectedGstLocationKey !== "primary" &&
          (selectedBusiness?.additionalGstLocations?.length ?? 0) > 0;
        invoicePayload.differentGst = useDifferent;
        invoicePayload.businessAdditionalGstId = useDifferent ? selectedGstLocationKey : null;
        invoicePayload.customerName = invoiceData.customerName;
        invoicePayload.customerPhone = invoiceData.customerPhone;
        invoicePayload.customerEmail = invoiceData.customerEmail;
        invoicePayload.customerAddress = invoiceData.customerAddress;
        invoicePayload.customerAddress2 = invoiceData.customerAddress2;
        invoicePayload.customerDistrict = invoiceData.customerDistrict;
        invoicePayload.customerState = invoiceData.customerState;
        invoicePayload.customerStateCode =
          invoiceData.customerStateCode ||
          indianStates.find((s) => s.name === invoiceData.customerState)?.code ||
          "";
        invoicePayload.customerPincode = invoiceData.customerPincode;
        invoicePayload.customerGst = invoiceData.customerGst;
        (invoicePayload as { serviceIds?: string[] }).serviceIds = includesServicesPeriod
          ? selectedServiceIds
          : [];
      } else {
        invoicePayload.customerName = invoiceData.customerName;
        invoicePayload.customerPhone = invoiceData.customerPhone;
        invoicePayload.customerEmail = invoiceData.customerEmail;
        invoicePayload.customerAddress = invoiceData.customerAddress;
        invoicePayload.customerAddress2 = invoiceData.customerAddress2;
        invoicePayload.customerDistrict = invoiceData.customerDistrict;
        invoicePayload.customerState = invoiceData.customerState;
        invoicePayload.customerStateCode =
          invoiceData.customerStateCode ||
          indianStates.find((s) => s.name === invoiceData.customerState)?.code ||
          "";
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

  const b2bHasMultiGst =
    selectedType === "B2B" &&
    !!selectedBusiness &&
    !!selectedBusiness.multipleGst &&
    (selectedBusiness.additionalGstLocations?.length ?? 0) > 0;

  const b2bNeedsGstPick = b2bHasMultiGst && selectedGstLocationKey === null;

  const b2bShowFullCustomerForm =
    selectedType !== "B2B" ||
    (selectedType === "B2B" &&
      ((!b2bHasMultiGst && businessInfoLoaded) ||
        (b2bHasMultiGst && selectedGstLocationKey !== null) ||
        (!businessId && businessInfoLoaded)));

  const showInvoiceRest = selectedType !== "B2B" || b2bShowFullCustomerForm;

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
            {selectedType === "B2B" && businessId && selectedBusiness && (
              <p className="text-sm text-muted-foreground">
                Linked business: {selectedBusiness.businessName}
              </p>
            )}

            {selectedType === "B2B" && businessId && selectedBusiness && b2bHasMultiGst && (
              <div>
                <Label>Billing GST registration *</Label>
                <Select
                  value={selectedGstLocationKey || ""}
                  onValueChange={onBillingGstLocationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GSTIN for this invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">
                      Primary ({selectedBusiness.gstNumber})
                    </SelectItem>
                    {selectedBusiness.additionalGstLocations?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.gstNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {b2bNeedsGstPick && (
                  <p className="text-sm text-amber-700 mt-1">Select a GST registration to edit the rest of the invoice.</p>
                )}
              </div>
            )}

            {selectedType === "B2B" && businessId && selectedBusiness && !b2bHasMultiGst && (
              <div>
                <Label>GSTIN</Label>
                <Input value={selectedBusiness.gstNumber} readOnly className="bg-muted" />
              </div>
            )}

            {selectedType === "B2B" && !businessId && (
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

            {(selectedType !== "B2B" ||
              (selectedBusiness && (b2bNeedsGstPick || b2bShowFullCustomerForm)) ||
              (!selectedBusiness && selectedType === "B2B" && businessInfoLoaded)) && (
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

            {b2bShowFullCustomerForm && (
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
                      onValueChange={(value: string) => setCustomerState(value)}
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

                {selectedType === "B2B" &&
                  invoiceData.customerGst &&
                  (b2bHasMultiGst || !businessId) && (
                  <div>
                    <Label>GSTIN (billing)</Label>
                    <Input value={invoiceData.customerGst} readOnly className="bg-muted" />
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

        {showInvoiceRest && (
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
        )}
      </div>

      {/* Services period - B2B only */}
      {showInvoiceRest && selectedType === "B2B" && businessId && (
        <Card>
          <CardHeader>
            <CardTitle>Services period (optional)</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              If this invoice covers a services period, enable below and select the services to include.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includesServicesPeriod"
                checked={includesServicesPeriod}
                onCheckedChange={(checked) => {
                  setIncludesServicesPeriod(!!checked);
                  if (!checked) setSelectedServiceIds([]);
                }}
              />
              <Label htmlFor="includesServicesPeriod" className="cursor-pointer">
                This invoice includes services period
              </Label>
            </div>
            {includesServicesPeriod && (
              <>
                {loadingServices ? (
                  <p className="text-sm text-gray-500">Loading services…</p>
                ) : businessServices.length === 0 ? (
                  <p className="text-sm text-gray-500">No services found for this business.</p>
                ) : (
                  <div className="space-y-2">
                    <Label>Select services to include in this invoice</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {businessServices.map((s) => {
                        const label = s.serviceType === "DOMAIN" && s.domainName
                          ? s.domainName
                          : (s.serviceType === "VPS" || s.serviceType === "WEB_HOSTING") && s.serverIp
                            ? s.serverIp
                            : s.serviceType === "DOMAIN_EMAIL" && s.emailName
                              ? s.emailName
                              : s.serviceType === "GST_SERVICES" && s.serviceCode
                                ? gstServiceCodeLabel(s.serviceCode)
                                : SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType;
                        const period = `${new Date(s.startDate).toLocaleDateString("en-IN")} – ${new Date(s.endDate).toLocaleDateString("en-IN")}`;
                        return (
                          <div key={s.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`service-${s.id}`}
                              checked={selectedServiceIds.includes(s.id)}
                              onCheckedChange={(checked) => {
                                setSelectedServiceIds((prev) =>
                                  checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                                );
                              }}
                            />
                            <Label htmlFor={`service-${s.id}`} className="cursor-pointer text-sm font-normal">
                              {SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}: {label} ({period})
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items Section */}
      {showInvoiceRest && (
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
      )}

      {/* Totals Summary */}
      {showInvoiceRest && (
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
      )}
    </div>
  );
}

