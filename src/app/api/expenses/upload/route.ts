import { NextRequest, NextResponse } from 'next/server';

const UPLOAD_URL = 'https://files.maroonsol.com/upload.php';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }
    
    // Forward the file to the external upload endpoint
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const uploadResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: uploadFormData,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return NextResponse.json(
        { error: 'Failed to upload file', details: errorText },
        { status: uploadResponse.status }
      );
    }
    
    const result = await uploadResponse.json();
    
    return NextResponse.json({
      url: result.url || result.fileUrl,
      filename: result.filename || file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

