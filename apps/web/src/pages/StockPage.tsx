import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { listStock, setStock, adjustStock, getWmsStock, getWmsStockAll, type StockItem, type WmsStockLevel } from '../lib/queries';
import { useAuth } from '../store/auth';

export default function StockPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [onHand, setOnHand] = useState('');
  const [reorderAt, setReorderAt] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [wmsDetail, setWmsDetail] = useState<{ sku: string; data: WmsStockLevel[] } | null>(null);
  const [wmsLoading, setWmsLoading] = useState(false);
  const [wmsAutoRefresh, setWmsAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: listStock,
  });

  // WMS stock — refresh every 30 min when enabled, or manual only
  const { data: wmsStockAll, dataUpdatedAt: wmsUpdatedAt, isFetching: wmsFetching } = useQuery({
    queryKey: ['wms-stock-all'],
    queryFn: getWmsStockAll,
    refetchInterval: wmsAutoRefresh ? 30 * 60 * 1000 : false,
  });
  const wmsQtyMap = new Map<string, number>();
  if (wmsStockAll) {
    for (const level of wmsStockAll) {
      wmsQtyMap.set(level.sku, (wmsQtyMap.get(level.sku) ?? 0) + level.qty);
    }
  }

  const setMut = useMutation({
    mutationFn: () =>
      setStock({
        productId: editing!.productId,
        onHand: Number(onHand),
        reorderAt: reorderAt ? Number(reorderAt) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      closeEdit();
    },
  });

  const adjustMut = useMutation({
    mutationFn: (delta: number) =>
      adjustStock({ productId: editing!.productId, delta }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      setAdjustDelta('');
    },
  });

  function openEdit(item: StockItem) {
    setEditing(item);
    setOnHand(String(item.onHand));
    setReorderAt(String(item.reorderAt));
    setAdjustDelta('');
  }

  function closeEdit() {
    setEditing(null);
    setOnHand('');
    setReorderAt('');
    setAdjustDelta('');
  }

  async function fetchWmsStock(sku: string) {
    setWmsLoading(true);
    try {
      const levels = await getWmsStock(sku);
      setWmsDetail({ sku, data: levels });
    } catch {
      setWmsDetail({ sku, data: [] });
    } finally {
      setWmsLoading(false);
    }
  }

  // Filter + paginate
  const filtered = (data ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.product.sku.toLowerCase().includes(q) ||
      s.product.name.toLowerCase().includes(q) ||
      s.product.brand.toLowerCase().includes(q)
    );
  });
  const totalFiltered = filtered.length;
  const isAll = pageSize === 0;
  const paged = isAll ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize));

  function exportCsv() {
    const rows = filtered.map((s) => {
      const wmsQty = wmsQtyMap.get(s.product.sku) ?? '';
      return [
        s.product.sku,
        `"${s.product.name}"`,
        s.product.brand,
        s.onHand,
        s.reserved,
        s.available,
        s.reorderAt,
        wmsQty,
      ].join(',');
    });
    const header = 'SKU,Name,Brand,On Hand,Reserved,Available,Reorder At,WMS Qty';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <>
      <PageHeader
        title={t('stock.title')}
        subtitle={t('stock.subtitle')}
        action={
          <Button variant="outline" onClick={exportCsv}>
            <span className="material-symbols-outlined !text-[18px]">download</span>
            CSV
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        {/* WMS sync control bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white rounded-brand-lg border border-gray-200 shadow-brand-sm px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined !text-[20px] text-gray-400">cloud_sync</span>
            <div>
              <div className="text-xs font-semibold text-gray-700">WMS Auto Sync</div>
              <div className="text-[10px] text-gray-400">
                {wmsUpdatedAt
                  ? `Last: ${new Date(wmsUpdatedAt).toLocaleTimeString('th-TH')} · ${wmsAutoRefresh ? 'Next in 30 min' : 'Paused'}`
                  : 'Not loaded yet'}
                {wmsFetching && ' · Syncing...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: ['wms-stock-all'] })}
              disabled={wmsFetching}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-brand border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined !text-[16px] ${wmsFetching ? 'animate-spin' : ''}`}>refresh</span>
              Sync Now
            </button>
            <button
              type="button"
              onClick={() => setWmsAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-brand text-xs font-bold transition ${
                wmsAutoRefresh
                  ? 'bg-status-success text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${wmsAutoRefresh ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
              {wmsAutoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Search + page size */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-gray-400">search</span>
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1.5 border border-gray-300 rounded-brand text-xs focus:outline-none focus:border-brand-red"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
              <option value={0}>All</option>
            </select>
            <span>of {totalFiltered}</span>
          </div>
        </div>

        <div className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.colSku')}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.colName')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.onHand')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.reserved')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.available')}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('stock.reorderAt')}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">WMS</th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-400">
                    {t('common.loading')}
                  </td>
                </tr>
              )}
              {!isLoading && totalFiltered === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-400">
                    {search ? `No results for "${search}"` : t('stock.empty')}
                  </td>
                </tr>
              )}
              {paged.map((s) => (
                <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${s.lowStock ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.product.sku}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.product.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{s.onHand}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">{s.reserved}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${s.lowStock ? 'text-brand-red' : 'text-status-success'}`}>
                    {s.available}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{s.reorderAt}</td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const wmsQty = wmsQtyMap.get(s.product.sku);
                      return (
                        <button
                          type="button"
                          onClick={() => fetchWmsStock(s.product.sku)}
                          disabled={wmsLoading}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold ${
                            wmsQty !== undefined && wmsQty > 0
                              ? 'bg-status-success-light text-status-success border border-status-success/30'
                              : 'border border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                          title="Click for WMS detail"
                        >
                          {wmsQty !== undefined ? wmsQty : '—'}
                        </button>
                      );
                    })()}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                        <span className="material-symbols-outlined !text-[14px]">edit</span>
                        {t('stock.adjustBtn')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          {!isAll && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              <div>
                {t('common.pageOf', { page: currentPage, totalPages, total: totalFiltered })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WMS Stock Detail popup */}
      <Modal
        open={!!wmsDetail}
        onClose={() => setWmsDetail(null)}
        title={`WMS On-Hand — ${wmsDetail?.sku ?? ''}`}
      >
        {wmsLoading && <div className="text-center py-4 text-gray-400">{t('common.loading')}</div>}
        {wmsDetail && !wmsLoading && (
          <div className="space-y-3">
            {wmsDetail.data.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <span className="material-symbols-outlined !text-[36px] block mb-1 text-gray-300">inventory_2</span>
                WMS: ไม่พบข้อมูลสต็อกสำหรับ {wmsDetail.sku}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-brand overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500">Warehouse / Location</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-500">Qty</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-500">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wmsDetail.data.map((level, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs">{level.warehouse}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-brand-navy">{level.qty}</td>
                        <td className="px-3 py-2 text-right text-[10px] text-gray-400">
                          {new Date(level.updatedAt).toLocaleTimeString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-xs">Total</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-lg text-brand-red">
                        {wmsDetail.data.reduce((sum, l) => sum + l.qty, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="material-symbols-outlined !text-[12px]">info</span>
              ข้อมูล real-time จาก Toptier WMS MobileApi
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!editing}
        onClose={closeEdit}
        title={editing ? t('stock.modalTitle', { name: editing.product.name }) : t('stock.adjustBtn')}
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>{t('common.close')}</Button>
            <Button
              onClick={() => setMut.mutate()}
              disabled={onHand === '' || setMut.isPending}
            >
              {setMut.isPending ? t('common.saving') : t('stock.saveSet')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              {t('stock.currentSummary', { onHand: editing.onHand, reserved: editing.reserved, available: editing.available })}
            </div>

            <Input
              id="st-onhand"
              label={t('stock.onHandLabel')}
              type="number"
              value={onHand}
              onChange={(e) => setOnHand(e.target.value)}
            />
            <Input
              id="st-reorder"
              label={t('stock.reorderLabel')}
              type="number"
              value={reorderAt}
              onChange={(e) => setReorderAt(e.target.value)}
            />

            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">{t('stock.deltaLabel')}</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t('stock.deltaPlaceholder')}
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-navy"
                />
                <Button
                  size="md"
                  variant="outline"
                  disabled={!adjustDelta || adjustMut.isPending}
                  onClick={() => adjustMut.mutate(Number(adjustDelta))}
                >
                  {adjustMut.isPending ? '...' : t('common.confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
