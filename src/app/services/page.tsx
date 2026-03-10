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

const SERVICE_TYPE_LABELS: Record<string, string> = {
  DOMAIN: "Domain",
  VPS: "VPS",
  WEB_HOSTING: "Web Hosting",
  DOMAIN_EMAIL: "Domain Email",
};

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
  domainName: string | null;
  serverIp: string | null;
  emailName: string | null;
  startDate: string;
  endDate: string;
  planCode: string | null;
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
  business: BusinessInfo | null;
  invoice?: { id: string; invoiceNumber: string; invoiceDate: string } | null;
}

const emptyForm = {
  id: "",
  businessId: "",
  serviceType: "",
  domainName: "",
  serverIp: "",
  emailName: "",
  startDate: "",
  endDate: "",
  planCode: "",
  invoiceId: "",
  invoiceYear: "",
  invoiceMonth: "",
};

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
  { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear type-specific fields when switching service type
    if (field === "serviceType") {
      setFormData((prev) => ({
        ...prev,
        serviceType: value,
        domainName: "",
        serverIp: "",
        emailName: "",
      }));
    }
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    setFormData(emptyForm);
    setFetchedInvoices([]);
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
    setFormData({
      id: service.id,
      businessId: service.businessId,
      serviceType: service.serviceType,
      domainName: service.domainName || "",
      serverIp: service.serverIp || "",
      emailName: service.emailName || "",
      startDate: service.startDate.slice(0, 10),
      endDate: service.endDate.slice(0, 10),
      planCode: service.planCode || "",
      invoiceId: service.invoiceId || "",
      invoiceYear: inv ? new Date(inv.invoiceDate).getFullYear().toString() : "",
      invoiceMonth: inv ? (new Date(inv.invoiceDate).getMonth() + 1).toString() : "",
    });
    if (inv) {
      setFetchedInvoices([{ id: inv.id, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate }]);
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
    if (!formData.startDate) {
      alert("Please enter start date");
      return;
    }
    if (!formData.endDate) {
      alert("Please enter end date");
      return;
    }

    const payload = {
      businessId: formData.businessId,
      serviceType: formData.serviceType,
      domainName: formData.serviceType === "DOMAIN" ? formData.domainName || null : null,
      serverIp:
        formData.serviceType === "VPS" || formData.serviceType === "WEB_HOSTING"
          ? formData.serverIp || null
          : null,
      emailName: formData.serviceType === "DOMAIN_EMAIL" ? formData.emailName || null : null,
      startDate: formData.startDate,
      endDate: formData.endDate,
      planCode: formData.planCode || null,
      invoiceId: formData.invoiceId || null,
    };

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
    return SERVICE_TYPE_LABELS[s.serviceType] || s.serviceType;
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
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">
            Manage domain, VPS, web hosting, and domain email services
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
                <TableHead>Service Type</TableHead>
                <TableHead>Domain / IP / Email</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Plan Code</TableHead>
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
                    <TableCell>{getServiceDisplay(service)}</TableCell>
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
                </SelectContent>
              </Select>
            </div>

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
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
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
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
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
                    value={formData.invoiceId}
                    onValueChange={(v) => handleInputChange("invoiceId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {isEditMode ? "Update Service" : "Add Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
