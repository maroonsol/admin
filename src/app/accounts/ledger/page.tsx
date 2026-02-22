"use client";

import { useState, useEffect } from "react";
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

interface BusinessInfo {
  id: string;
  businessName: string;
  gstNumber: string;
}

interface LedgerEntry {
  srNo: number;
  date: string;
  particulars: string;
  vchType: string;
  vchNo: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerData {
  businessName: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export default function LedgerPage() {
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<"screen" | "pdf" | "csv">("screen");
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchBusinesses();
    // Set default end date to current date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setEndDate(todayStr);
  }, []);

  // Helper function to format date as YYYY-MM-DD (handles timezone correctly)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get current financial year dates (April 1 to March 31)
  const getCurrentFinancialYear = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    let fyStartYear: number;
    let fyEndYear: number;
    
    if (currentMonth >= 4) {
      // April to December - FY starts in current year
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else {
      // January to March - FY started in previous year
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    // Create dates at midnight local time to avoid timezone issues
    const startDate = new Date(fyStartYear, 3, 1); // April 1 (month is 0-indexed, so 3 = April)
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(fyEndYear, 2, 31); // March 31 (month is 0-indexed, so 2 = March)
    endDate.setHours(0, 0, 0, 0);
    
    return {
      start: startDate,
      end: endDate
    };
  };

  // Helper function to get previous financial year dates
  const getPreviousFinancialYear = () => {
    const currentFY = getCurrentFinancialYear();
    const prevFYStartYear = currentFY.start.getFullYear() - 1;
    const prevFYEndYear = currentFY.start.getFullYear();
    
    // Create dates at midnight local time to avoid timezone issues
    const startDate = new Date(prevFYStartYear, 3, 1); // April 1
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(prevFYEndYear, 2, 31); // March 31
    endDate.setHours(0, 0, 0, 0);
    
    return {
      start: startDate,
      end: endDate
    };
  };

  // Helper function to get current month dates
  const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    return {
      start: new Date(year, month, 1), // First day of current month
      end: new Date(year, month + 1, 0) // Last day of current month
    };
  };

  // Helper function to get previous month dates
  const getPreviousMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    return {
      start: new Date(year, month - 1, 1), // First day of previous month
      end: new Date(year, month, 0) // Last day of previous month
    };
  };

  // Preset button handlers
  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;
    
    switch (preset) {
      case 'thisFinancialYear':
        const currentFY = getCurrentFinancialYear();
        start = currentFY.start;
        end = currentFY.end; // Always April 1 to March 31
        break;
      case 'previousFinancialYear':
        const prevFY = getPreviousFinancialYear();
        start = prevFY.start;
        end = prevFY.end; // Always April 1 to March 31
        break;
      case 'thisMonth':
        const currentMonth = getCurrentMonth();
        start = currentMonth.start;
        end = currentMonth.end;
        // If end date is in the future, use today instead
        if (end > today) {
          end = today;
        }
        break;
      case 'previousMonth':
        const prevMonth = getPreviousMonth();
        start = prevMonth.start;
        end = prevMonth.end;
        break;
      default:
        return;
    }
    
    setStartDate(formatDateForInput(start));
    setEndDate(formatDateForInput(end));
  };

  const fetchBusinesses = async () => {
    try {
      // Fetch all businesses
      const response = await fetch("/api/business-info?search=all");
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBusinessId || !startDate || !endDate) {
      setError("Please select business and date range");
      return;
    }

    setLoading(true);
    setError("");
    setLedgerData(null);

    try {
      const params = new URLSearchParams({
        businessId: selectedBusinessId,
        startDate: startDate,
        endDate: endDate,
        format: outputFormat,
      });

      if (outputFormat === "screen") {
        const response = await fetch(`/api/ledger?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setLedgerData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to generate ledger");
        }
      } else {
        // For PDF and CSV, trigger download
        window.open(`/api/ledger?${params.toString()}`, "_blank");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error generating ledger:", error);
      setError("Failed to generate ledger");
    } finally {
      if (outputFormat === "screen") {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ledger Statement</h1>
        <p className="text-gray-600 mt-1">Generate ledger statements for businesses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Business Selection */}
            <div>
              <Label htmlFor="business">Select Business *</Label>
              <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.businessName} ({business.gstNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Presets */}
            <div>
              <Label>Quick Date Range</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick('thisFinancialYear')}
                  className="text-xs"
                >
                  This Financial Year
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick('previousFinancialYear')}
                  className="text-xs"
                >
                  Previous Financial Year
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick('thisMonth')}
                  className="text-xs"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick('previousMonth')}
                  className="text-xs"
                >
                  Previous Month
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Output Format */}
            <div>
              <Label htmlFor="format">Output Format *</Label>
              <Select
                value={outputFormat}
                onValueChange={(value: "screen" | "pdf" | "csv") => setOutputFormat(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screen">Screen</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Generate Ledger"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Display (Screen Format) */}
      {ledgerData && outputFormat === "screen" && (
        <Card>
          <CardHeader>
            <CardTitle>Ledger Statement</CardTitle>
            <div className="text-sm text-gray-600 mt-2">
              <div className="font-semibold">{ledgerData.businessName}</div>
              <div>Period: {formatDate(ledgerData.startDate)} to {formatDate(ledgerData.endDate)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Sr No.</TableHead>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="min-w-[200px]">Particulars</TableHead>
                    <TableHead className="w-32">Vch Type</TableHead>
                    <TableHead className="w-32">Vch No.</TableHead>
                    <TableHead className="w-32 text-right">Debit (₹)</TableHead>
                    <TableHead className="w-32 text-right">Credit (₹)</TableHead>
                    <TableHead className="w-32 text-right">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className="text-center"></TableCell>
                    <TableCell></TableCell>
                    <TableCell>Opening Balance</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledgerData.openingBalance)}
                    </TableCell>
                  </TableRow>

                  {/* Transaction Entries */}
                  {ledgerData.entries.map((entry) => (
                    <TableRow key={entry.srNo}>
                      <TableCell className="text-center">{entry.srNo}</TableCell>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.particulars}</TableCell>
                      <TableCell>{entry.vchType}</TableCell>
                      <TableCell>{entry.vchNo}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Closing Balance */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className="text-center"></TableCell>
                    <TableCell></TableCell>
                    <TableCell>Closing Balance</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledgerData.closingBalance)}
                    </TableCell>
                  </TableRow>

                  {/* Total Row */}
                  <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-400">
                    <TableCell className="text-center"></TableCell>
                    <TableCell></TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledgerData.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledgerData.totalCredit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ledgerData.closingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

