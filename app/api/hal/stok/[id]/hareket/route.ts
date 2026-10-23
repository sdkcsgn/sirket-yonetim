export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Stok hareket geçmişi
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const hareketler = await prisma.stokHareket.findMany({
      where: { stokId: parseInt(resolvedParams.id) },
      include: { cari: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(hareketler);
  } catch (error) {
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Stok girişi ve müstahsil cari alacağı
export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}