"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  SERVICE_TYPE_LABELS,
  GST_SERVICE_CODES,
  gstServiceCodeLabel,
} from "@/lib/service-codes";

interface BusinessInfo {
  id: string;
  gstNumber: string;
  businessName: string;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal?: number;
  business?: { businessName?: string };
}

interface Service {
  id: string;
  businessId: string;
  serviceType: string;
  serviceCode: string;
  domainName: string | null;
  serverIp: string | null;
  emailName: string | null;
  startDate: string;
  endDate: string;
  planCode: string | null;
  invoiceId: string | null;
  gstFilingYear: number | null;
  gstFilingMonth: number | null;
  gstQuarter: number | null;
  gstr1FilingDate: string | null;
  gstr3bFilingDate: string | null;
  totalGstPaid: number | null;
  filledSummaryFileUrl: string | null;
  challanFileUrl: string | null;
  gstNotes: string | null;
  createdAt: string;
  updatedAt: string;
  business: BusinessInfo | null;
  invoice?: { id: string; invoiceNumber: string; invoiceDate: string } | null;
}

const emptyForm = {
  id: "",
  businessId: "",
  serviceType: "",
  gstServiceCode: "",
  domainName: "",
  serverIp: "",
  emailName: "",
  startDate: "",
  endDate: "",
  planCode: "",
  invoiceId: "",
  invoiceYear: "",
  invoiceMonth: "",
  gstCalendarYear: "",
  gstFilingMonth: "",
  gstFyStartYear: "",
  gstQuarter: "",
  gstr1FilingDate: "",
  gstr3bFilingDate: "",
  totalGstPaid: "",
  filledSummaryFileUrl: "",
  challanFileUrl: "",
  gstNotes: "",
};

const MONTHS = [
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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [fetchedInvoices, setFetchedInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [filledSummaryFile, setFilledSummaryFile] = useState<File | null>(null);
  const [challanFile, setChallanFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchBusinesses();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch("/api/business-info?search=all");
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "serviceType") {
        return {
          ...next,
          serviceType: value,
          domainName: "",
          serverIp: "",
          emailName: "",
          gstServiceCode: "",
          gstCalendarYear: "",
          gstFilingMonth: "",
          gstFyStartYear: "",
          gstQuarter: "",
          gstr1FilingDate: "",
          gstr3bFilingDate: "",
          totalGstPaid: "",
          filledSummaryFileUrl: "",
          challanFileUrl: "",
          gstNotes: "",
        };
      }
      return next;
    });
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    setFormData(emptyForm);
    setFetchedInvoices([]);
    setFilledSummaryFile(null);
    setChallanFile(null);
    setIsDialogOpen(true);
  };

  const fetchInvoicesByMonth = async () => {
    const year = formData.invoiceYear;
    const month = formData.invoiceMonth;
    if (!year || !month) return;
    setLoadingInvoices(true);
    setFetchedInvoices([]);
    try {
      const res = await fetch(
        `/api/invoices/list?year=${year}&month=${month}&all=true`
      );
      if (res.ok) {
        const data = await res.json();
        setFetchedInvoices(data);
      } else {
        setFetchedInvoices([]);
      }
    } catch {
      setFetchedInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleEditClick = (service: Service) => {
    setIsEditMode(true);
    const inv = service.invoice;
    const code = service.serviceCode || "";
    const isMonthly = code === "GST_FILING_MON";
    const isQuarterly = code === "GST_FILING_QTR";

    setFormData({
      id: service.id,
      businessId: service.businessId,
      serviceType: service.serviceType,
      gstServiceCode: service.serviceType === "GST_SERVICES" ? code : "",
      domainName: service.domainName || "",
      serverIp: service.serverIp || "",
      emailName: service.emailName || "",
      startDate: service.startDate.slice(0, 10),
      endDate: service.endDate.slice(0, 10),
      planCode: service.planCode || "",
      invoiceId: service.invoiceId || "",
      invoiceYear: inv ? new Date(inv.invoiceDate).getFullYear().toString() : "",
      invoiceMonth: inv ? (new Date(inv.invoiceDate).getMonth() + 1).toString() : "",
      gstCalendarYear:
        isMonthly && service.gstFilingYear != null
          ? String(service.gstFilingYear)
          : "",
      gstFilingMonth:
        isMonthly && service.gstFilingMonth != null
          ? String(service.gstFilingMonth)
          : "",
      gstFyStartYear:
        isQuarterly && service.gstFilingYear != null
          ? String(service.gstFilingYear)
          : "",
      gstQuarter:
        isQuarterly && service.gstQuarter != null
          ? String(service.gstQuarter)
          : "",
      gstr1FilingDate: service.gstr1FilingDate
        ? service.gstr1FilingDate.slice(0, 10)
        : "",
      gstr3bFilingDate: service.gstr3bFilingDate
        ? service.gstr3bFilingDate.slice(0, 10)
        : "",
      totalGstPaid:
        service.totalGstPaid != null ? String(service.totalGstPaid) : "",
      filledSummaryFileUrl: service.filledSummaryFileUrl || "",
      challanFileUrl: service.challanFileUrl || "",
      gstNotes: service.gstNotes || "",
    });
    setFilledSummaryFile(null);
    setChallanFile(null);
    if (inv) {
      setFetchedInvoices([
        { id: inv.id, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate },
      ]);
    } else {
      setFetchedInvoices([]);
    }
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const response = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchServices();
        if (formData.id === id) {
          setIsDialogOpen(false);
          setFormData(emptyForm);
          setIsEditMode(false);
        }
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service");
    }
  };

  const handleDeleteInDialog = async () => {
    if (!formData.id) return;
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const response = await fetch(`/api/services/${formData.id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchServices();
        setIsDialogOpen(false);
        setFormData(emptyForm);
        setIsEditMode(false);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service");
    }
  };

  const uploadFiles = async (): Promise<{
    filledSummaryFileUrl?: string;
    challanFileUrl?: string;
  }> => {
    const code = formData.gstServiceCode;
    if (!formData.businessId || !code) return {};

    let kind: "monthly" | "quarterly" | "registration" | "amendment";
    if (code === "GST_FILING_MON") kind = "monthly";
    else if (code === "GST_FILING_QTR") kind = "quarterly";
    else if (code === "GST_REGISTRATION") kind = "registration";
    else if (code === "GST_AMENDMENT") kind = "amendment";
    else return {};

    if (!filledSummaryFile && !challanFile) {
      return {};
    }

    const fd = new FormData();
    fd.append("businessId", formData.businessId);
    fd.append("kind", kind);
    if (kind === "monthly") {
      fd.append("calendarYear", formData.gstCalendarYear);
      fd.append("month", formData.gstFilingMonth);
    }
    if (kind === "quarterly") {
      fd.append("fyStartYear", formData.gstFyStartYear);
      fd.append("quarter", formData.gstQuarter);
    }
    if (filledSummaryFile) fd.append("filledSummary", filledSummaryFile);
    if (challanFile) fd.append("challan", challanFile);

    setUploading(true);
    try {
      const res = await fetch("/api/services/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Upload failed");
      }
      return {
        filledSummaryFileUrl: json.filledSummaryFileUrl ?? undefined,
        challanFileUrl: json.challanFileUrl ?? undefined,
      };
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessId) {
      alert("Please select a business");
      return;
    }
    if (!formData.serviceType) {
      alert("Please select a service type");
      return;
    }

    const gstCode = formData.gstServiceCode;

    if (formData.serviceType === "GST_SERVICES") {
      if (!gstCode) {
        alert("Please select a GST service code");
        return;
      }
      if (gstCode === "GST_FILING_MON") {
        if (!formData.gstCalendarYear || !formData.gstFilingMonth) {
          alert("Select calendar year and month for monthly filing");
          return;
        }
      }
      if (gstCode === "GST_FILING_QTR") {
        if (!formData.gstFyStartYear || !formData.gstQuarter) {
          alert("Select FY start year (April) and quarter");
          return;
        }
      }
      const filing =
        gstCode === "GST_FILING_MON" || gstCode === "GST_FILING_QTR";
      if (filing) {
        if (!formData.gstr1FilingDate || !formData.gstr3bFilingDate) {
          alert("GSTR-1 and GSTR-3B filing dates are required");
          return;
        }
        if (!formData.totalGstPaid) {
          alert("Total GST paid amount is required for filing");
          return;
        }
        const hasSummary =
          filledSummaryFile || formData.filledSummaryFileUrl;
        if (!hasSummary) {
          alert("Upload a filled summary (or keep an existing file when editing)");
          return;
        }
      } else {
        if (!formData.startDate || !formData.endDate) {
          alert("Start and end dates are required");
          return;
        }
      }
    } else {
      if (!formData.startDate || !formData.endDate) {
        alert("Please enter start and end dates");
        return;
      }
    }

    let summaryUrl = formData.filledSummaryFileUrl || "";
    let challanUrl = formData.challanFileUrl || "";

    if (
      formData.serviceType === "GST_SERVICES" &&
      (filledSummaryFile || challanFile)
    ) {
      try {
        const uploaded = await uploadFiles();
        if (uploaded.filledSummaryFileUrl) summaryUrl = uploaded.filledSummaryFileUrl;
        if (uploaded.challanFileUrl) challanUrl = uploaded.challanFileUrl;
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
        return;
      }
    }

    const payload: Record<string, unknown> = {
      businessId: formData.businessId,
      serviceType: formData.serviceType,
      planCode: formData.planCode || null,
      invoiceId:
        formData.invoiceId && formData.invoiceId !== "none"
          ? formData.invoiceId
          : null,
    };

    if (formData.serviceType === "GST_SERVICES") {
      payload.serviceCode = gstCode;
      payload.domainName = null;
      payload.serverIp = null;
      payload.emailName = null;
      if (gstCode === "GST_FILING_MON") {
        payload.gstFilingYear = Number(formData.gstCalendarYear);
        payload.gstFilingMonth = Number(formData.gstFilingMonth);
        payload.gstQuarter = null;
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      } else if (gstCode === "GST_FILING_QTR") {
        payload.gstFilingYear = Number(formData.gstFyStartYear);
        payload.gstQuarter = Number(formData.gstQuarter);
        payload.gstFilingMonth = null;
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      } else {
        payload.gstFilingYear = null;
        payload.gstFilingMonth = null;
        payload.gstQuarter = null;
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      }
      payload.gstr1FilingDate =
        gstCode === "GST_FILING_MON" || gstCode === "GST_FILING_QTR"
          ? formData.gstr1FilingDate
          : null;
      payload.gstr3bFilingDate =
        gstCode === "GST_FILING_MON" || gstCode === "GST_FILING_QTR"
          ? formData.gstr3bFilingDate
          : null;
      payload.totalGstPaid =
        gstCode === "GST_FILING_MON" || gstCode === "GST_FILING_QTR"
          ? Number(formData.totalGstPaid)
          : null;
      payload.filledSummaryFileUrl =
        gstCode === "GST_FILING_MON" ||
        gstCode === "GST_FILING_QTR" ||
        gstCode === "GST_REGISTRATION" ||
        gstCode === "GST_AMENDMENT"
          ? summaryUrl || null
          : null;
      payload.challanFileUrl = challanUrl || null;
      payload.gstNotes = formData.gstNotes || null;
    } else {
      payload.domainName =
        formData.serviceType === "DOMAIN" ? formData.domainName || null : null;
      payload.serverIp =
        formData.serviceType === "VPS" || formData.serviceType === "WEB_HOSTING"
          ? formData.serverIp || null
          : null;
      payload.emailName =
        formData.serviceType === "DOMAIN_EMAIL"
          ? formData.emailName || null
          : null;
      payload.startDate = formData.startDate;
      payload.endDate = formData.endDate;
    }

    try {
      if (isEditMode) {
        const response = await fetch(`/api/services/${formData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          await fetchServices();
          setIsDialogOpen(false);
          setFormData(emptyForm);
          setIsEditMode(false);
          setFilledSummaryFile(null);
          setChallanFile(null);
        } else {
          const error = await response.json();
          alert(error.error || "Failed to update service");
        }
      } else {
        const response = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          await fetchServices();
          setIsDialogOpen(false);
          setFormData(emptyForm);
          setFilledSummaryFile(null);
          setChallanFile(null);
        } else {
          const error = await response.json();
          alert(error.error || "Failed to create service");
        }
      }
    } catch (error) {
      console.error("Error saving service:", error);
      alert(`Failed to ${isEditMode ? "update" : "create"} service`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getServiceDisplay = (s: Service) => {
    if (s.serviceType === "DOMAIN" && s.domainName) return s.domainName;
    if ((s.serviceType === "VPS" || s.serviceType === "WEB_HOSTING") && s.serverIp)
      return s.serverIp;
    if (s.serviceType === "DOMAIN_EMAIL" && s.emailName) return s.emailName;
    if (s.serviceType === "GST_SERVICES" && s.serviceCode) {
      return gstServiceCodeLabel(s.serviceCode);
    }
    return SERVICE_TYPE_LABELS[s.serviceType] || s.serviceType;
  };

  const isGstFiling =
    formData.serviceType === "GST_SERVICES" &&
    (formData.gstServiceCode === "GST_FILING_MON" ||
      formData.gstServiceCode === "GST_FILING_QTR");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">
            Manage domain, hosting, email, and GST services
          </p>
        </div>
        <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700">
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Code / detail</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No services found. Click &quot;Add Service&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow
                    key={service.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEditClick(service)}
                  >
                    <TableCell className="font-medium">
                      {service.business?.businessName ?? "-"} ({service.business?.gstNumber ?? "-"})
                    </TableCell>
                    <TableCell>
                      {SERVICE_TYPE_LABELS[service.serviceType] || service.serviceType}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">{service.serviceCode || "—"}</span>
                      <br />
                      {getServiceDisplay(service)}
                    </TableCell>
                    <TableCell>{formatDate(service.startDate)}</TableCell>
                    <TableCell>{formatDate(service.endDate)}</TableCell>
                    <TableCell>{service.planCode || "-"}</TableCell>
                    <TableCell>{service.invoice?.invoiceNumber ?? "-"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(service)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(e, service.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              Select business and service type, then fill the required details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Business *</Label>
              <Select
                value={formData.businessId}
                onValueChange={(value) => handleInputChange("businessId", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.businessName} ({b.gstNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => handleInputChange("serviceType", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMAIN">Domain</SelectItem>
                  <SelectItem value="VPS">VPS</SelectItem>
                  <SelectItem value="WEB_HOSTING">Web Hosting</SelectItem>
                  <SelectItem value="DOMAIN_EMAIL">Domain Email</SelectItem>
                  <SelectItem value="GST_SERVICES">GST services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.serviceType === "GST_SERVICES" && (
              <div>
                <Label>GST service *</Label>
                <Select
                  value={formData.gstServiceCode}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, gstServiceCode: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST service" />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_SERVICE_CODES.map((g) => (
                      <SelectItem key={g.code} value={g.code}>
                        {g.label} ({g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.serviceType === "DOMAIN" && (
              <div>
                <Label htmlFor="domainName">Domain Name *</Label>
                <Input
                  id="domainName"
                  value={formData.domainName}
                  onChange={(e) => handleInputChange("domainName", e.target.value)}
                  placeholder="e.g. example.com"
                />
              </div>
            )}

            {(formData.serviceType === "VPS" || formData.serviceType === "WEB_HOSTING") && (
              <div>
                <Label htmlFor="serverIp">Server IP *</Label>
                <Input
                  id="serverIp"
                  value={formData.serverIp}
                  onChange={(e) => handleInputChange("serverIp", e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                />
              </div>
            )}

            {formData.serviceType === "DOMAIN_EMAIL" && (
              <div>
                <Label htmlFor="emailName">Email Name *</Label>
                <Input
                  id="emailName"
                  value={formData.emailName}
                  onChange={(e) => handleInputChange("emailName", e.target.value)}
                  placeholder="e.g. info@domain.com"
                />
              </div>
            )}

            {formData.serviceType === "GST_SERVICES" &&
              formData.gstServiceCode === "GST_FILING_MON" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calendar year *</Label>
                    <Input
                      type="number"
                      value={formData.gstCalendarYear}
                      onChange={(e) =>
                        handleInputChange("gstCalendarYear", e.target.value)
                      }
                      placeholder="e.g. 2026"
                    />
                  </div>
                  <div>
                    <Label>Month *</Label>
                    <Select
                      value={formData.gstFilingMonth}
                      onValueChange={(v) => handleInputChange("gstFilingMonth", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

            {formData.serviceType === "GST_SERVICES" &&
              formData.gstServiceCode === "GST_FILING_QTR" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>FY start year (April) *</Label>
                    <Input
                      type="number"
                      value={formData.gstFyStartYear}
                      onChange={(e) =>
                        handleInputChange("gstFyStartYear", e.target.value)
                      }
                      placeholder="e.g. 2025 for FY 2025-26"
                    />
                  </div>
                  <div>
                    <Label>Quarter *</Label>
                    <Select
                      value={formData.gstQuarter}
                      onValueChange={(v) => handleInputChange("gstQuarter", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1 (Apr–Jun)</SelectItem>
                        <SelectItem value="2">Q2 (Jul–Sep)</SelectItem>
                        <SelectItem value="3">Q3 (Oct–Dec)</SelectItem>
                        <SelectItem value="4">Q4 (Jan–Mar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

            {isGstFiling && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gstr1">GSTR-1 filing date *</Label>
                    <Input
                      id="gstr1"
                      type="date"
                      value={formData.gstr1FilingDate}
                      onChange={(e) =>
                        handleInputChange("gstr1FilingDate", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstr3b">GSTR-3B filing date *</Label>
                    <Input
                      id="gstr3b"
                      type="date"
                      value={formData.gstr3bFilingDate}
                      onChange={(e) =>
                        handleInputChange("gstr3bFilingDate", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Total GST paid (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.totalGstPaid}
                    onChange={(e) =>
                      handleInputChange("totalGstPaid", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 rounded border p-3 bg-muted/30">
                  <Label>Uploads</Label>
                  <p className="text-xs text-muted-foreground">
                    Filled summary is required for filing. Challan optional. Configure{" "}
                    <code className="text-xs">INTERNAL_FILES_UPLOAD_URL</code> for uploads.
                  </p>
                  <div>
                    <Label className="text-xs">Filled summary PDF / file</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setFilledSummaryFile(e.target.files?.[0] ?? null)
                      }
                    />
                    {formData.filledSummaryFileUrl && (
                      <a
                        href={formData.filledSummaryFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 block mt-1"
                      >
                        Current file
                      </a>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Challan (optional)</Label>
                    <Input
                      type="file"
                      onChange={(e) => setChallanFile(e.target.files?.[0] ?? null)}
                    />
                    {formData.challanFileUrl && (
                      <a
                        href={formData.challanFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 block mt-1"
                      >
                        Current file
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {formData.serviceType === "GST_SERVICES" &&
              (formData.gstServiceCode === "GST_REGISTRATION" ||
                formData.gstServiceCode === "GST_AMENDMENT") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstStart">Start date *</Label>
                      <Input
                        id="gstStart"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          handleInputChange("startDate", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="gstEnd">End date *</Label>
                      <Input
                        id="gstEnd"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          handleInputChange("endDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input
                      value={formData.gstNotes}
                      onChange={(e) =>
                        handleInputChange("gstNotes", e.target.value)
                      }
                      placeholder="Reference / remarks"
                    />
                  </div>
                  <div className="space-y-2 rounded border p-3 bg-muted/30">
                    <Label>Documents (optional)</Label>
                    <div>
                      <Label className="text-xs">Filled summary / certificate</Label>
                      <Input
                        type="file"
                        onChange={(e) =>
                          setFilledSummaryFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Other (e.g. challan)</Label>
                      <Input
                        type="file"
                        onChange={(e) =>
                          setChallanFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  </div>
                </>
              )}

            {formData.serviceType !== "GST_SERVICES" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {formData.serviceType === "GST_SERVICES" && isGstFiling && (
              <p className="text-xs text-muted-foreground">
                Period start/end are set automatically from the month or quarter you selected.
              </p>
            )}

            <div>
              <Label htmlFor="planCode">Plan Code (optional)</Label>
              <Input
                id="planCode"
                value={formData.planCode}
                onChange={(e) => handleInputChange("planCode", e.target.value)}
                placeholder="Plan code if any"
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4 bg-gray-50/50">
              <Label className="text-sm font-medium">Link to invoice (optional)</Label>
              <p className="text-xs text-gray-500">
                Select invoice year and month, fetch invoices, then choose one to link to this service.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[100px]">
                  <Label className="text-xs">Year</Label>
                  <Select
                    value={formData.invoiceYear}
                    onValueChange={(v) => {
                      handleInputChange("invoiceYear", v);
                      setFetchedInvoices([]);
                      handleInputChange("invoiceId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[120px]">
                  <Label className="text-xs">Month</Label>
                  <Select
                    value={formData.invoiceMonth}
                    onValueChange={(v) => {
                      handleInputChange("invoiceMonth", v);
                      setFetchedInvoices([]);
                      handleInputChange("invoiceId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchInvoicesByMonth}
                  disabled={!formData.invoiceYear || !formData.invoiceMonth || loadingInvoices}
                >
                  {loadingInvoices ? "Fetching…" : "Fetch invoices"}
                </Button>
              </div>
              {fetchedInvoices.length > 0 && (
                <div>
                  <Label className="text-xs">Select invoice</Label>
                  <Select
                    value={formData.invoiceId ? formData.invoiceId : "none"}
                    onValueChange={(v) =>
                      handleInputChange("invoiceId", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {fetchedInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoiceNumber}
                          {inv.invoiceDate
                            ? ` (${new Date(inv.invoiceDate).toLocaleDateString("en-IN")})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDeleteInDialog}
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setIsEditMode(false);
                  setFormData(emptyForm);
                  setFilledSummaryFile(null);
                  setChallanFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? "Uploading…" : isEditMode ? "Update Service" : "Add Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
