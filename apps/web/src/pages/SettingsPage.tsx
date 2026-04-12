import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import api from '../lib/api';

interface ConfigItem {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  value: string;
  hasValue: boolean;
  updatedAt: string | null;
}

async function getIntegrations() {
  const res = await api.get('/internal/settings/integrations');
  return res.data.data as ConfigItem[];
}

async function saveIntegrations(settings: Array<{ key: string; value: string }>) {
  const res = await api.put('/internal/settings/integrations', { settings });
  return res.data.data;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-integrations'],
    queryFn: getIntegrations,
  });

  useEffect(() => {
    if (data) {
      const initial: Record<string, string> = {};
      for (const item of data) {
        initial[item.key] = item.value;
      }
      setForm(initial);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value }));
      return saveIntegrations(settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-integrations'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  // Group items by group name
  const groups: Record<string, ConfigItem[]> = {};
  for (const item of data ?? []) {
    (groups[item.group] ??= []).push(item);
  }

  const GROUP_ICONS: Record<string, string> = {
    WMS: 'warehouse',
    'LINE OA': 'chat',
    Payment: 'payments',
    Google: 'login',
  };

  return (
    <>
      <PageHeader
        title={t('nav.sectionSystem') + ' — Integrations'}
        subtitle="Config credentials สำหรับเชื่อมต่อระบบภายนอก"
      />

      <div className="p-4 sm:p-6 max-w-3xl">
        {isLoading && <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>}

        {!isLoading && (
          <div className="space-y-6">
            {Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName} className="bg-white rounded-brand-lg shadow-brand-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="material-symbols-outlined !text-[20px] text-gray-500">
                    {GROUP_ICONS[groupName] ?? 'settings'}
                  </span>
                  <h3 className="font-semibold text-sm text-gray-800">{groupName}</h3>
                  {items.some((i) => i.hasValue) && (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-status-success-light text-status-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Configured
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {items.map((item) => (
                    <div key={item.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {item.label}
                        {item.type === 'password' && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((p) => ({ ...p, [item.key]: !p[item.key] }))
                            }
                            className="ml-2 text-[10px] text-brand-red hover:underline"
                          >
                            {showPasswords[item.key] ? 'ซ่อน' : 'แสดง'}
                          </button>
                        )}
                      </label>
                      <input
                        type={item.type === 'password' && !showPasswords[item.key] ? 'password' : 'text'}
                        value={form[item.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                        placeholder={item.placeholder ?? ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red font-mono"
                      />
                      {item.updatedAt && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Updated: {new Date(item.updatedAt).toLocaleString('th-TH')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                <span className="material-symbols-outlined !text-[18px]">save</span>
                {saveMut.isPending ? t('common.saving') : t('common.save')}
              </Button>
              {success && (
                <span className="text-xs text-status-success font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[16px]">check_circle</span>
                  บันทึกสำเร็จ
                </span>
              )}
              {saveMut.isError && (
                <span className="text-xs text-brand-red">
                  บันทึกไม่สำเร็จ — {String(saveMut.error)}
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-brand border border-gray-200 p-4 text-xs text-gray-500">
              <div className="font-semibold text-gray-700 mb-1">หมายเหตุ</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>ค่า Password/Secret จะถูก mask ด้วย •• เมื่อแสดงผล — บันทึกค่าใหม่ได้โดยพิมพ์ทับ</li>
                <li>ถ้าปล่อยค่าที่ mask ไว้ไม่แก้ → ระบบจะไม่เปลี่ยนค่าเดิม</li>
                <li>WMS: ใส่ Username + Password แล้วระบบจะขอ API Key อัตโนมัติ</li>
                <li>LINE OA: ต้องใส่ Channel Access Token เพื่อส่ง push message</li>
                <li>เปลี่ยน config แล้วมีผลทันที ไม่ต้อง restart server</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
