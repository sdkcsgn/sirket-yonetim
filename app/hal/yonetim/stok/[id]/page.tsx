'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StokHareketPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tip = searchParams.get('tip') || 'GIRIS';

  const [cariler, setCariler] = useState<any[]>([]);
  const [hareketler, setHareketler] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Verileri
  const [formData, setFormData] = useState({
    cariId: '',
    yeniMustahsilUnvan: '',
    giris: '',
    dara: '',
    birimFiyat: '',
    odaNo: '',
    belgeNo: '',
    aciklama: '',
  });

  useEffect(() => {
    fetchCariler();
    fetchHareketler();
  }, [params.id]);

  const fetchCariler = async () => {
    const res = await fetch('/api/hal/cariler?tip=URETICI');
    if (res.ok) {
      const data = await res.json();
      setCariler(data);
    }
  };

  const fetchHareketler = async () => {
    const res = await fetch(`/api/hal/stok/${params.id}/hareket`);
    if (res.ok) {
      const data = await res.json();
      setHareketler(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = editingId ? 'PUT' : 'POST';
    const body = editingId
      ? { ...formData, id: editingId, stokId: parseInt(params.id) }
      : { ...formData, stokId: parseInt(params.id), tip };

    const res = await fetch(`/api/hal/stok/${params.id}/hareket`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) {
      resetForm();
      fetchHareketler();
      router.refresh();
    } else {
      alert('İşlem başarısız oldu.');
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      cariId: item.cariId ? String(item.cariId) : '',
      yeniMustahsilUnvan: '',
      giris: String(item.giris),
      dara: String(item.dara || ''),
      birimFiyat: String(item.birimFiyat || ''),
      odaNo: item.odaNo || '',
      belgeNo: item.belgeNo || '',
      aciklama: item.aciklama || '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu stok hareketini silmek istediğinize emin misiniz? Cari ve stok bakiyesi de düzelecektir.')) return;

    const res = await fetch(`/api/hal/stok/${params.id}/hareket?id=${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchHareketler();
      router.refresh();
    } else {
      alert('Silme işlemi başarısız.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      cariId: '',
      yeniMustahsilUnvan: '',
      giris: '',
      dara: '',
      birimFiyat: '',
      odaNo: '',
      belgeNo: '',
      aciklama: '',
    });
  };

  const netKilo = (parseFloat(formData.giris) || 0) - (parseFloat(formData.dara) || 0);
  const toplamTutar = netKilo * (parseFloat(formData.birimFiyat) || 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* FORM ALANI */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-6">
          {editingId ? 'Stok Hareketini Düzenle' : `${tip === 'GIRIS' ? 'Stok Giriş' : 'Stok Çıkış'} Formu`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Müstahsil Seçimi */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Müstahsil / Cari</label>
              <select
                value={formData.cariId}
                onChange={(e) => setFormData({ ...formData, cariId: e.target.value, yeniMustahsilUnvan: '' })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Cari Seçin --</option>
                {cariler.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.unvan}
                  </option>
                ))}
              </select>
            </div>

            {/* Yeni Müstahsil Unvanı (Cari Yoksa) */}
            {!formData.cariId && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">VEYA Yeni Müstahsil Unvanı</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.yeniMustahsilUnvan}
                  onChange={(e) => setFormData({ ...formData, yeniMustahsilUnvan: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            )}

            {/* Brüt Miktar */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Brüt Miktar (KG)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.giris}
                onChange={(e) => setFormData({ ...formData, giris: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Dara */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Dara (KG)</label>
              <input
                type="number"
                step="0.01"
                value={formData.dara}
                onChange={(e) => setFormData({ ...formData, dara: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Birim Fiyat */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Birim Fiyat (TL/KG)</label>
              <input
                type="number"
                step="0.01"
                value={formData.birimFiyat}
                onChange={(e) => setFormData({ ...formData, birimFiyat: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Depo / Oda No */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Depo / Oda No</label>
              <input
                type="text"
                placeholder="Örn: Soğuk Hava Deposu Oda 3"
                value={formData.odaNo}
                onChange={(e) => setFormData({ ...formData, odaNo: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Belge No */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Belge / İrsaliye No</label>
              <input
                type="text"
                value={formData.belgeNo}
                onChange={(e) => setFormData({ ...formData, belgeNo: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          {/* Hesaplanan Özet */}
          <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center text-sm border border-slate-700/50">
            <div>Net Kilo: <span className="font-bold text-emerald-400">{netKilo > 0 ? netKilo : 0} KG</span></div>
            <div>Tahmini Tutar: <span className="font-bold text-emerald-400">{toplamTutar.toFixed(2)} TL</span></div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition"
            >
              {loading ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Stoğa Ekle'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg"
              >
                İptal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* STOK HAREKETLERİ TABLOSU (DÜZENLE & SİL) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Stok Hareket Geçmişi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">Tarih</th>
                <th className="p-3">Müstahsil</th>
                <th className="p-3">Giriş (Net)</th>
                <th className="p-3">Fiyat</th>
                <th className="p-3">Toplam</th>
                <th className="p-3">Oda</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {hareketler.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/50">
                  <td className="p-3">{new Date(h.tarih).toLocaleDateString('tr-TR')}</td>
                  <td className="p-3">{h.cari?.unvan || '-'}</td>
                  <td className="p-3 text-emerald-400 font-semibold">{h.giris} KG</td>
                  <td className="p-3">{h.birimFiyat} TL</td>
                  <td className="p-3 font-semibold">{h.toplamTutar} TL</td>
                  <td className="p-3">{h.odaNo || '-'}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(h)}
                      className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1 rounded text-xs"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(h)}
                      className="bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-3 py-1 rounded text-xs"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}