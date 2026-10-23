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

// POST: Yeni stok hareketi ekleme
export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}

// PUT: Ana stok kartı bilgilerini güncelle (İsim, Kod, Kategori vb.)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const stokId = parseInt(resolvedParams.id);
    const body = await req.json();

    const { ad, kod, kategori, birim, minStok } = body;

    const guncelStok = await prisma.stok.update({
      where: { id: stokId },
      data: {
        ad,
        kod,
        kategori,
        birim,
        minStok: minStok ? parseFloat(minStok) : 0,
      },
    });

    return NextResponse.json({ success: true, data: guncelStok });
  } catch (error) {
    return NextResponse.json({ error: 'Stok güncellenemedi' }, { status: 500 });
  }
}

// DELETE: Stok hareketini sil
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hareketId = searchParams.get('hareketId');

    if (!hareketId) {
      return NextResponse.json({ error: 'Hareket ID gerekli' }, { status: 400 });
    }

    const id = parseInt(hareketId);
    
    const hareket = await prisma.stokHareket.findUnique({ where: { id } }) as any;
    if (!hareket) {
      return NextResponse.json({ error: 'Hareket bulunamadı' }, { status: 404 });
    }

    // Fatura kaynaklı hareketlerin doğrudan silinmesini engeller
    if (hareket.faturaId || hareket.faturaID) {
      return NextResponse.json({ error: 'Fatura kaynaklı hareketler doğrudan silinemez' }, { status: 400 });
    }

    await prisma.stokHareket.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Hareket silindi' });
  } catch (error) {
    return NextResponse.json({ error: 'Silme işlemi başarısız' }, { status: 500 });
  }
}