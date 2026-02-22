"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Section {
  id: string;
  title: string;
  icon: string;
  description: string;
  subsections: SubSection[];
}

interface SubSection {
  title: string;
  href: string;
  icon: string;
}

const sections: Section[] = [
  {
    id: "invoices",
    title: "Invoices",
    icon: "📄",
    description: "Manage invoices, create new ones, and analyze data",
    subsections: [
      { title: "All Invoices", href: "/invoices", icon: "📋" },
      { title: "Create Invoice", href: "/invoices/create", icon: "➕" },
      { title: "Analysis", href: "/invoices/analysis", icon: "📊" },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    icon: "💰",
    description: "Manage payments, credits, and bank accounts",
    subsections: [
      { title: "Credits", href: "/accounts/credits", icon: "💳" },
      { title: "Bank Details", href: "/accounts/banks", icon: "🏦" },
    ],
  },
  {
    id: "employees",
    title: "Employees",
    icon: "👥",
    description: "Manage employee information and details",
    subsections: [
      { title: "All Employees", href: "/employees", icon: "👥" },
    ],
  },
  {
    id: "expenses",
    title: "Expenses",
    icon: "💸",
    description: "Track and manage business expenses",
    subsections: [
      { title: "All Expenses", href: "/expenses", icon: "💰" },
    ],
  },
  {
    id: "business-info",
    title: "Business Info",
    icon: "🏢",
    description: "Manage business information and GST details",
    subsections: [
      { title: "All Business Info", href: "/business-info", icon: "🏢" },
    ],
  },
  {
    id: "users",
    title: "Users",
    icon: "👤",
    description: "Manage system users and their roles",
    subsections: [
      { title: "All Users", href: "/users", icon: "👤" },
    ],
  },
];

export default function DashboardPage() {
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Select a section to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Card
              key={section.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedSection(section)}
            >
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <span className="text-5xl">{section.icon}</span>
                  <div>
                    <CardTitle className="text-2xl">{section.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{section.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subsection Dialog */}
        <Dialog
          open={selectedSection !== null}
          onOpenChange={(open) => !open && setSelectedSection(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span className="text-2xl">{selectedSection?.icon}</span>
                <span>{selectedSection?.title}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedSection?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {selectedSection?.subsections.map((subsection) => (
                <Link
                  key={subsection.href}
                  href={subsection.href}
                  onClick={() => setSelectedSection(null)}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start space-x-3 h-auto py-3"
                  >
                    <span className="text-xl">{subsection.icon}</span>
                    <span>{subsection.title}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
