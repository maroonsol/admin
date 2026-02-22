"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface HSNData {
  hsnSac: string;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalQuantity: number;
}

interface AnalysisData {
  month: number;
  year: number;
  b2b: HSNData[];
  b2c: HSNData[];
}

export default function AnalysisPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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

  const fetchAnalysis = async () => {
    if (!selectedMonth || !selectedYear) {
      setError("Please select both month and year");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/invoices/analysis?month=${selectedMonth}&year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysisData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch analysis");
        setAnalysisData(null);
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      setError("Failed to fetch analysis");
      setAnalysisData(null);
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

  const calculateTotals = (data: HSNData[]) => {
    return {
      taxableAmount: data.reduce((sum, item) => sum + item.taxableAmount, 0),
      gstAmount: data.reduce((sum, item) => sum + item.gstAmount, 0),
      totalQuantity: data.reduce((sum, item) => sum + item.totalQuantity, 0),
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoice Analysis</h1>
        <p className="text-gray-600 mt-1">HSN/SAC code analysis by month</p>
      </div>

      {/* Month and Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
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
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Year
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
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
            <Button 
              onClick={fetchAnalysis} 
              disabled={loading || !selectedMonth || !selectedYear}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Loading..." : "Fetch Analysis"}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisData && (
        <div className="space-y-6">
          {/* B2B Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">B2B Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                {months[analysisData.month - 1]?.label} {analysisData.year}
              </p>
            </CardHeader>
            <CardContent>
              {analysisData.b2b.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HSN/SAC Code</TableHead>
                          <TableHead>GST Rate (%)</TableHead>
                          <TableHead className="text-right">Total Quantity</TableHead>
                          <TableHead className="text-right">Taxable Amount</TableHead>
                          <TableHead className="text-right">GST Amount</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.b2b.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.hsnSac}</TableCell>
                            <TableCell>{item.gstRate}%</TableCell>
                            <TableCell className="text-right">{item.totalQuantity.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.taxableAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.gstAmount)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.taxableAmount + item.gstAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Total Quantity: </span>
                        <span className="font-semibold">{calculateTotals(analysisData.b2b).totalQuantity.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Taxable: </span>
                        <span className="font-semibold">{formatCurrency(calculateTotals(analysisData.b2b).taxableAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total GST: </span>
                        <span className="font-semibold">{formatCurrency(calculateTotals(analysisData.b2b).gstAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Grand Total: </span>
                        <span className="font-semibold text-blue-700">
                          {formatCurrency(calculateTotals(analysisData.b2b).taxableAmount + calculateTotals(analysisData.b2b).gstAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No B2B invoices found for this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* B2C Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">B2C Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                {months[analysisData.month - 1]?.label} {analysisData.year}
              </p>
            </CardHeader>
            <CardContent>
              {analysisData.b2c.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HSN/SAC Code</TableHead>
                          <TableHead>GST Rate (%)</TableHead>
                          <TableHead className="text-right">Total Quantity</TableHead>
                          <TableHead className="text-right">Taxable Amount</TableHead>
                          <TableHead className="text-right">GST Amount</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.b2c.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.hsnSac}</TableCell>
                            <TableCell>{item.gstRate}%</TableCell>
                            <TableCell className="text-right">{item.totalQuantity.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.taxableAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.gstAmount)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.taxableAmount + item.gstAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Total Quantity: </span>
                        <span className="font-semibold">{calculateTotals(analysisData.b2c).totalQuantity.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Taxable: </span>
                        <span className="font-semibold">{formatCurrency(calculateTotals(analysisData.b2c).taxableAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total GST: </span>
                        <span className="font-semibold">{formatCurrency(calculateTotals(analysisData.b2c).gstAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Grand Total: </span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(calculateTotals(analysisData.b2c).taxableAmount + calculateTotals(analysisData.b2c).gstAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No B2C invoices found for this month
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}



