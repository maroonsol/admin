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
  TableRow 
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
import { indianStates } from "@/lib/data";

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
  createdAt: string;
  updatedAt: string;
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
  });

  useEffect(() => {
    fetchBusinesses();
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
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-update state code when state is selected
    if (field === 'businessState') {
      const selectedState = indianStates.find(s => s.name === value);
      setFormData(prev => ({
        ...prev,
        businessState: value,
        businessStateCode: selectedState?.code || ""
      }));
    }
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
    });
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
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let response;
      if (isEditMode) {
        // Update existing business
        response = await fetch('/api/business-info', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new business
        response = await fetch('/api/business-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        await fetchBusinesses();
        setIsDialogOpen(false);
        // Reset form
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
        });
        setIsEditMode(false);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${isEditMode ? 'update' : 'create'} business info`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} business info:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} business info`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
        <Button 
          onClick={handleAddClick}
          className="bg-blue-600 hover:bg-blue-700"
        >
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
                  <TableCell colSpan={7} className="text-center text-gray-500">
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
                    <TableCell className="font-medium">
                      {business.gstNumber}
                    </TableCell>
                    <TableCell>{business.businessName}</TableCell>
                    <TableCell>{business.businessPhone || "-"}</TableCell>
                    <TableCell>{business.businessEmail || "-"}</TableCell>
                    <TableCell>
                      {business.businessState ? `${business.businessState} (${business.businessStateCode || ""})` : "-"}
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

      {/* Add/Edit Business Info Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Business Info' : 'Add New Business Info'}</DialogTitle>
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
              <Label htmlFor="businessAddress">Address Line 1</Label>
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
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {isEditMode ? 'Update Business Info' : 'Add Business Info'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

