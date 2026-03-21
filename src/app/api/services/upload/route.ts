import { NextRequest, NextResponse } from 'next/server';
import {
  getIndianFinancialYearLabel,
  financialYearLabelFromFyStartYear,
  monthFolderSegment,
  quarterFolderSegment,
} from '@/lib/service-codes';

export const runtime = 'nodejs';

/**
 * Proxies GST document uploads to the PHP host (INTERNAL_FILES_UPLOAD_URL).
 * No shared secret — restrict access at your reverse proxy / firewall if needed.
 */
export async function POST(request: NextRequest) {
  const baseUrl = process.env.INTERNAL_FILES_UPLOAD_URL?.trim();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error:
          'File upload is not configured. Set INTERNAL_FILES_UPLOAD_URL in .env.',
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const businessId = String(form.get('businessId') ?? '');
  const kind = String(form.get('kind') ?? '');

  if (!businessId || !kind) {
    return NextResponse.json({ error: 'businessId and kind are required' }, { status: 400 });
  }

  const filledSummary = form.get('filledSummary');
  const challan = form.get('challan');

  let fiscalYear = '';
  let period = '';

  if (kind === 'monthly') {
    const y = parseInt(String(form.get('calendarYear')), 10);
    const m = parseInt(String(form.get('month')), 10);
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json(
        { error: 'Valid calendarYear and month (1–12) are required for monthly uploads' },
        { status: 400 }
      );
    }
    fiscalYear = getIndianFinancialYearLabel(y, m);
    period = monthFolderSegment(m);
  } else if (kind === 'quarterly') {
    const fyStart = parseInt(String(form.get('fyStartYear')), 10);
    const q = parseInt(String(form.get('quarter')), 10);
    if (!fyStart || !q || q < 1 || q > 4) {
      return NextResponse.json(
        { error: 'Valid fyStartYear and quarter (1–4) are required for quarterly uploads' },
        { status: 400 }
      );
    }
    fiscalYear = financialYearLabelFromFyStartYear(fyStart);
    period = quarterFolderSegment(q);
  } else if (kind === 'registration' || kind === 'amendment') {
    fiscalYear = '';
    period = '';
  } else {
    return NextResponse.json(
      { error: 'kind must be monthly, quarterly, registration, or amendment' },
      { status: 400 }
    );
  }

  const out = new FormData();
  out.append('business_id', businessId);
  out.append('kind', kind);
  if (fiscalYear) out.append('fiscal_year', fiscalYear);
  if (period) out.append('period', period);

  if (filledSummary instanceof File && filledSummary.size > 0) {
    out.append('filledSummary', filledSummary, filledSummary.name);
  }
  if (challan instanceof File && challan.size > 0) {
    out.append('challan', challan, challan.name);
  }

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      body: out,
    });
    const text = await res.text();
    let json: { filledSummaryFileUrl?: string | null; challanFileUrl?: string | null; error?: string };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      return NextResponse.json(
        { error: 'Upload server returned non-JSON', detail: text.slice(0, 500) },
        { status: 502 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: json.error || 'Upload failed', status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }
    return NextResponse.json(json);
  } catch (e) {
    console.error('Upload proxy error:', e);
    return NextResponse.json({ error: 'Failed to reach upload server' }, { status: 502 });
  }
}
