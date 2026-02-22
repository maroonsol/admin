# Invoice Management System

A comprehensive invoice management system built with Next.js, Prisma, and TypeScript that supports B2B, B2C, and Export invoices with PDF generation.

## Features

### Invoice Types
- **B2B Invoices**: For business-to-business transactions with GST details
- **B2C Invoices**: For business-to-consumer transactions
- **Export Invoices**: For international customers with zero GST

### Key Features
- ✅ Complete invoice creation with validation
- ✅ Automatic invoice numbering (B2B/2025-26/1, B2C/2025-26/1, EXP/2025-26/1)
- ✅ HSN/SAC code selection with automatic GST rate calculation
- ✅ State-wise GST calculation (CGST+SGST for Bihar, IGST for others)
- ✅ PDF generation with professional invoice layout
- ✅ Database storage with Prisma ORM
- ✅ Responsive UI with modern design
- ✅ Invoice listing with download and edit options

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
1. Create a MySQL database
2. Create a `.env` file with your database URL:
```env
DATABASE_URL="mysql://username:password@localhost:3306/your_database_name"
```

### 3. Generate Prisma Client
```bash
npm run db:generate
```

### 4. Push Database Schema
```bash
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```

## Usage

### Creating Invoices

1. Navigate to `/invoices/create`
2. Choose invoice type (B2B, B2C, or Export)
3. Fill in customer/business details
4. Add invoice items with HSN/SAC codes
5. Review totals and create invoice
6. PDF will be automatically generated and downloaded

### Invoice Details

#### B2B Invoices
- Business name, phone, email (required)
- GST number (required)
- Complete address with state selection
- Automatic CGST+SGST for Bihar, IGST for other states

#### B2C Invoices
- Customer name, phone, email (required)
- No GST number required
- Complete address with state selection
- Same GST calculation as B2B

#### Export Invoices
- Customer name, phone, email (required)
- Country and currency selection
- LUT number (required)
- Exchange rate
- Zero GST on all items

### Invoice Numbering
- **B2B**: B2B/2025-26/1, B2B/2025-26/2, etc.
- **B2C**: B2C/2025-26/1, B2C/2025-26/2, etc.
- **Export**: EXP/2025-26/1, EXP/2025-26/2, etc.

Financial year changes automatically (2025-26, 2026-27, etc.)

## File Structure

```
src/
├── app/
│   ├── invoices/
│   │   ├── layout.tsx          # Sidebar navigation
│   │   ├── page.tsx            # Invoice listing
│   │   └── create/
│   │       └── page.tsx        # Invoice creation
│   └── api/
│       └── invoices/
│           ├── route.ts        # GET/POST invoices
│           └── [id]/
│               └── route.ts    # GET/PUT/DELETE specific invoice
├── components/
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── data.ts                 # Indian states, HSN/SAC codes, currencies
│   ├── invoice-service.ts      # Database operations
│   ├── pdf-generator.ts        # PDF generation logic
│   └── utils.ts                # Utility functions
└── prisma/
    └── schema.prisma           # Database schema
```

## API Endpoints

- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/[id]` - Get specific invoice
- `PUT /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Delete invoice

## Database Schema

### Invoice Model
- Basic invoice information (number, type, date)
- Customer/business details
- Financial totals (subtotal, tax, discount, grand total)
- Export-specific fields (currency, exchange rate, LUT number)

### InvoiceItem Model
- Item details (HSN/SAC, description, quantity, rate)
- Tax calculations (IGST, CGST, SGST)
- Line totals

## PDF Features

- Professional invoice layout
- Company logo placeholder
- Complete customer and company information
- Itemized table with tax breakdown
- Bank details and payment terms
- Amount in words
- Export-specific information (LUT, zero GST)

## Customization

### Adding New HSN/SAC Codes
Edit `src/lib/data.ts` and add new codes to the `hsnSacCodes` array.

### Modifying Company Information
Update the `companyInfo` object in `src/lib/data.ts`.

### Styling
The system uses Tailwind CSS. Modify the UI components in `src/components/ui/` for styling changes.

## Requirements

- Node.js 18+
- MySQL database
- Modern web browser

## Technologies Used

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Database**: Prisma ORM with MySQL
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

## Support

For issues or questions, please check the code comments and ensure all dependencies are properly installed.
