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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { indianStates } from "@/lib/data";

interface BusinessAdditionalGst {
  id: string;
  gstNumber: string;
  businessAddress: string | null;
  businessAddress2: string | null;
  businessDistrict: string | null;
  businessState: string | null;
  businessStateCode: string | null;
  businessPincode: string | null;
}

interface BusinessInfo {
  id: string;
  gstNumber: string;
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessAddress2: string | null;
  businessDistrict: string | null;
  businessState: string | null;
  businessStateCode: string | null;
  businessPincode: string | null;
  multipleGst: boolean;
  additionalGstLocations?: BusinessAdditionalGst[];
  createdAt: string;
  updatedAt: string;
}

type AdditionalRow = {
  key: string;
  gstNumber: string;
  businessAddress: string;
  businessAddress2: string;
  businessDistrict: string;
  businessState: string;
  businessStateCode: string;
  businessPincode: string;
};

function emptyAdditionalRow(): AdditionalRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    gstNumber: "",
    businessAddress: "",
    businessAddress2: "",
    businessDistrict: "",
    businessState: "",
    businessStateCode: "",
    businessPincode: "",
  };
}

export default function BusinessInfoPage() {
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    gstNumber: "",
    businessName: "",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    businessAddress2: "",
    businessDistrict: "",
    businessState: "",
    businessStateCode: "",
    businessPincode: "",
    multipleGst: false,
  });
  const [additionalRows, setAdditionalRows] = useState<AdditionalRow[]>([]);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch("/api/business-info?search=all");
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "businessState") {
      const selectedState = indianStates.find((s) => s.name === value);
      setFormData((prev) => ({
        ...prev,
        businessState: value,
        businessStateCode: selectedState?.code || "",
      }));
    }
  };

  const updateAdditionalRow = (key: string, field: keyof AdditionalRow, value: string) => {
    setAdditionalRows((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, [field]: value };
        if (field === "businessState") {
          const selectedState = indianStates.find((s) => s.name === value);
          next.businessStateCode = selectedState?.code || "";
        }
        return next;
      })
    );
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    setFormData({
      id: "",
      gstNumber: "",
      businessName: "",
      businessPhone: "",
      businessEmail: "",
      businessAddress: "",
      businessAddress2: "",
      businessDistrict: "",
      businessState: "",
      businessStateCode: "",
      businessPincode: "",
      multipleGst: false,
    });
    setAdditionalRows([]);
    setIsDialogOpen(true);
  };

  const handleEditClick = (business: BusinessInfo) => {
    setIsEditMode(true);
    setFormData({
      id: business.id,
      gstNumber: business.gstNumber,
      businessName: business.businessName,
      businessPhone: business.businessPhone || "",
      businessEmail: business.businessEmail || "",
      businessAddress: business.businessAddress || "",
      businessAddress2: business.businessAddress2 || "",
      businessDistrict: business.businessDistrict || "",
      businessState: business.businessState || "",
      businessStateCode: business.businessStateCode || "",
      businessPincode: business.businessPincode || "",
      multipleGst: business.multipleGst ?? false,
    });
    const locs = business.additionalGstLocations ?? [];
    setAdditionalRows(
      locs.length > 0
        ? locs.map((l) => ({
            key: l.id,
            gstNumber: l.gstNumber,
            businessAddress: l.businessAddress || "",
            businessAddress2: l.businessAddress2 || "",
            businessDistrict: l.businessDistrict || "",
            businessState: l.businessState || "",
            businessStateCode: l.businessStateCode || "",
            businessPincode: l.businessPincode || "",
          }))
        : []
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      multipleGst: formData.multipleGst,
      additionalGstLocations: formData.multipleGst
        ? additionalRows.map((r) => ({
            gstNumber: r.gstNumber,
            businessAddress: r.businessAddress || null,
            businessAddress2: r.businessAddress2 || null,
            businessDistrict: r.businessDistrict || null,
            businessState: r.businessState || null,
            businessStateCode: r.businessStateCode || null,
            businessPincode: r.businessPincode || null,
          }))
        : [],
    };

    try {
      let response;
      if (isEditMode) {
        response = await fetch("/api/business-info", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const { id: _id, ...createBody } = payload;
        response = await fetch("/api/business-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        });
      }

      if (response.ok) {
        await fetchBusinesses();
        setIsDialogOpen(false);
        setFormData({
          id: "",
          gstNumber: "",
          businessName: "",
          businessPhone: "",
          businessEmail: "",
          businessAddress: "",
          businessAddress2: "",
          businessDistrict: "",
          businessState: "",
          businessStateCode: "",
          businessPincode: "",
          multipleGst: false,
        });
        setAdditionalRows([]);
        setIsEditMode(false);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${isEditMode ? "update" : "create"} business info`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} business info:`, error);
      alert(`Failed to ${isEditMode ? "update" : "create"} business info`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Business Info</h1>
          <p className="text-gray-600 mt-1">Manage business information and details</p>
        </div>
        <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700">
          Add Business Info
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Business Info</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GST Number</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Multi GST</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>State</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No business info found. Click &quot;Add Business Info&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business) => (
                  <TableRow
                    key={business.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEditClick(business)}
                  >
                    <TableCell className="font-medium">{business.gstNumber}</TableCell>
                    <TableCell>{business.businessName}</TableCell>
                    <TableCell>{business.multipleGst ? "Yes" : "No"}</TableCell>
                    <TableCell>{business.businessPhone || "-"}</TableCell>
                    <TableCell>{business.businessEmail || "-"}</TableCell>
                    <TableCell>
                      {business.businessState
                        ? `${business.businessState} (${business.businessStateCode || ""})`
                        : "-"}
                    </TableCell>
                    <TableCell>{business.businessDistrict || "-"}</TableCell>
                    <TableCell>{formatDate(business.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Business Info" : "Add New Business Info"}</DialogTitle>
            <DialogDescription>
              Fill in the business details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gstNumber">GST Number *</Label>
                <Input
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                  placeholder="15-digit GST number"
                  required
                  disabled={isEditMode}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">GST number cannot be changed</p>
                )}
              </div>
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessPhone">Phone</Label>
                <Input
                  id="businessPhone"
                  value={formData.businessPhone}
                  onChange={(e) => handleInputChange("businessPhone", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="businessEmail">Email</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => handleInputChange("businessEmail", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="businessAddress">Address Line 1 (primary GST)</Label>
              <Textarea
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="businessAddress2">Address Line 2</Label>
              <Textarea
                id="businessAddress2"
                value={formData.businessAddress2}
                onChange={(e) => handleInputChange("businessAddress2", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="businessDistrict">District</Label>
                <Input
                  id="businessDistrict"
                  value={formData.businessDistrict}
                  onChange={(e) => handleInputChange("businessDistrict", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="businessState">State</Label>
                <Select
                  value={formData.businessState}
                  onValueChange={(value) => handleInputChange("businessState", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianStates.map((state) => (
                      <SelectItem key={state.code} value={state.name}>
                        {state.name} ({state.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="businessPincode">Pincode</Label>
                <Input
                  id="businessPincode"
                  value={formData.businessPincode}
                  onChange={(e) => handleInputChange("businessPincode", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id="multipleGst"
                checked={formData.multipleGst}
                onCheckedChange={(checked) => {
                  const on = !!checked;
                  setFormData((prev) => ({ ...prev, multipleGst: on }));
                  if (on && additionalRows.length === 0) {
                    setAdditionalRows([emptyAdditionalRow()]);
                  }
                  if (!on) {
                    setAdditionalRows([]);
                  }
                }}
              />
              <Label htmlFor="multipleGst" className="cursor-pointer text-sm font-medium leading-none">
                Multiple GST registrations (additional GSTINs with separate addresses)
              </Label>
            </div>

            {formData.multipleGst && (
              <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Add each extra GSTIN and its billing address. The primary GSTIN above stays the main registration.
                </p>
                {additionalRows.map((row, idx) => (
                  <div key={row.key} className="space-y-3 border rounded-lg p-3 bg-background">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Additional GST {idx + 1}</span>
                      {additionalRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() =>
                            setAdditionalRows((r) => r.filter((x) => x.key !== row.key))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>GST Number *</Label>
                      <Input
                        value={row.gstNumber}
                        onChange={(e) =>
                          updateAdditionalRow(row.key, "gstNumber", e.target.value.toUpperCase())
                        }
                        placeholder="15-digit GST number"
                        required
                      />
                    </div>
                    <div>
                      <Label>Address Line 1</Label>
                      <Textarea
                        value={row.businessAddress}
                        onChange={(e) =>
                          updateAdditionalRow(row.key, "businessAddress", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Address Line 2</Label>
                      <Textarea
                        value={row.businessAddress2}
                        onChange={(e) =>
                          updateAdditionalRow(row.key, "businessAddress2", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>District</Label>
                        <Input
                          value={row.businessDistrict}
                          onChange={(e) =>
                            updateAdditionalRow(row.key, "businessDistrict", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Select
                          value={row.businessState}
                          onValueChange={(v) => updateAdditionalRow(row.key, "businessState", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
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
                      <div>
                        <Label>Pincode</Label>
                        <Input
                          value={row.businessPincode}
                          onChange={(e) =>
                            updateAdditionalRow(row.key, "businessPincode", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdditionalRows((r) => [...r, emptyAdditionalRow()])}
                >
                  Add more GST
                </Button>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setIsEditMode(false);
                  setFormData({
                    id: "",
                    gstNumber: "",
                    businessName: "",
                    businessPhone: "",
                    businessEmail: "",
                    businessAddress: "",
                    businessAddress2: "",
                    businessDistrict: "",
                    businessState: "",
                    businessStateCode: "",
                    businessPincode: "",
                    multipleGst: false,
                  });
                  setAdditionalRows([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {isEditMode ? "Update Business Info" : "Add Business Info"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
