import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Select, Spin, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { calculateTireSetUsage } from '../../lib/tireSetUsage';
import { getUserSetupsForTireUsage } from '../../services/setupService';
import { addTireSet, getUserTireSets, updateTireSet } from '../../services/tireSetService';
import type { CarSetup } from '../../types/setup';
import type { TireSet, TireSetInput } from '../../types/tire';
import type { Vehicle } from '../../types/vehicle';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';

interface TireSetManagerModalProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

interface TireSetFormValues {
  code: string;
  manufacturer: string;
  productName: string;
  compound?: string;
  frontSize?: string;
  rearSize?: string;
  status: TireSet['status'];
  startedAt?: Dayjs | null;
  initialDistanceKm?: number;
  initialLaps?: number;
  initialHeatCycles?: number;
  notes?: string;
}

const statusColor: Record<TireSet['status'], string> = {
  active: 'green',
  stored: 'blue',
  retired: 'default',
};

export function TireSetManagerModal({ open, vehicle, onClose }: TireSetManagerModalProps) {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const formatNumber = useCallback((value: number) => new Intl.NumberFormat(locale).format(value), [locale]);
  const statusOptions = useMemo(() => [
    { value: 'active', label: t('vehicle.tireSet.status.active') },
    { value: 'stored', label: t('vehicle.tireSet.status.stored') },
    { value: 'retired', label: t('vehicle.tireSet.status.retired') },
  ], [t]);
  const [form] = Form.useForm<TireSetFormValues>();
  const [sets, setSets] = useState<TireSet[]>([]);
  const [setups, setSetups] = useState<CarSetup[]>([]);
  const [editing, setEditing] = useState<TireSet | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser || !open) return;
    setLoading(true);
    try {
      const [nextSets, nextSetups] = await Promise.all([
        getUserTireSets(currentUser.uid),
        getUserSetupsForTireUsage(currentUser.uid),
      ]);
      setSets(nextSets);
      setSetups(nextSetups);
    } catch (error) {
      console.error(error);
      message.error(t('vehicle.tireSet.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [currentUser, open, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleSets = useMemo(
    () => sets.filter((set) => set.primaryVehicleId === vehicle?.id),
    [sets, vehicle?.id],
  );

  const openNew = () => {
    setEditing(null);
    form.setFieldsValue({
      code: `TIRE-${String(vehicleSets.length + 1).padStart(2, '0')}`,
      manufacturer: '', productName: '', compound: '', frontSize: '', rearSize: '',
      status: 'active', startedAt: dayjs(), initialDistanceKm: 0, initialLaps: 0,
      initialHeatCycles: 0, notes: '',
    });
    setShowEditor(true);
  };

  const openEdit = (set: TireSet) => {
    setEditing(set);
    form.setFieldsValue({
      ...set,
      startedAt: set.startedAt ? dayjs(set.startedAt) : null,
    });
    setShowEditor(true);
  };

  const save = async () => {
    if (!currentUser || !vehicle?.id) return;
    const values = await form.validateFields();
    const input: TireSetInput = {
      userId: currentUser.uid,
      code: values.code.trim(),
      manufacturer: values.manufacturer.trim(),
      productName: values.productName.trim(),
      compound: values.compound?.trim() ?? '',
      frontSize: values.frontSize?.trim() ?? '',
      rearSize: values.rearSize?.trim() ?? '',
      primaryVehicleId: vehicle.id,
      status: values.status,
      startedAt: values.startedAt?.toDate() ?? null,
      initialDistanceKm: values.initialDistanceKm ?? 0,
      initialLaps: values.initialLaps ?? 0,
      initialHeatCycles: values.initialHeatCycles ?? 0,
      notes: values.notes?.trim() ?? '',
    };

    const duplicate = sets.some((set) =>
      set.id !== editing?.id && set.code.toLocaleLowerCase() === input.code.toLocaleLowerCase(),
    );
    if (duplicate) {
      form.setFields([{ name: 'code', errors: [t('vehicle.tireSet.errors.duplicateCode')] }]);
      return;
    }

    setSaving(true);
    try {
      if (editing?.id) await updateTireSet(editing.id, input);
      else await addTireSet(input);
      message.success(t(editing ? 'vehicle.tireSet.success.updated' : 'vehicle.tireSet.success.created'));
      setShowEditor(false);
      await load();
    } catch (error) {
      console.error(error);
      message.error(t('vehicle.tireSet.errors.save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={vehicle ? t('vehicle.tireSet.titleForVehicle', { vehicle: `${vehicle.make} ${vehicle.model}` }) : t('vehicle.tireSet.title')}
      width={820}
      footer={<Button onClick={onClose}>{t('common.close')}</Button>}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center py-16"><Spin /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>{t('vehicle.tireSet.actions.add')}</Button>
          </div>
          {vehicleSets.length === 0 ? (
            <Empty description={t('vehicle.tireSet.empty')} />
          ) : (
            <div className="space-y-3">
              {vehicleSets.map((set) => {
                const usage = calculateTireSetUsage(set, setups);
                return (
                  <section key={set.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{set.code}</span>
                          <Tag color={statusColor[set.status]}>{statusOptions.find((item) => item.value === set.status)?.label}</Tag>
                        </div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {set.manufacturer} {set.productName}{set.compound ? ` / ${set.compound}` : ''}
                        </div>
                        {(set.frontSize || set.rearSize) && (
                          <div className="text-xs text-gray-500">F {set.frontSize || t('common.notSet')} / R {set.rearSize || t('common.notSet')}</div>
                        )}
                      </div>
                      <Button icon={<EditOutlined />} onClick={() => openEdit(set)}>{t('common.edit')}</Button>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-gray-500">{t('vehicle.tireSet.usage.distance')}</dt><dd className="font-semibold">{formatNumber(usage.distanceKm)} km</dd></div>
                      <div><dt className="text-xs text-gray-500">{t('vehicle.tireSet.usage.laps')}</dt><dd className="font-semibold">{t('vehicle.tireSet.counts.laps', { count: usage.laps, formatted: formatNumber(usage.laps) })}</dd></div>
                      <div><dt className="text-xs text-gray-500">{t('vehicle.tireSet.usage.heatCycles')}</dt><dd className="font-semibold">{t('vehicle.tireSet.counts.times', { count: usage.heatCycles, formatted: formatNumber(usage.heatCycles) })}</dd></div>
                      <div><dt className="text-xs text-gray-500">{t('vehicle.tireSet.usage.sessions')}</dt><dd className="font-semibold">{t('vehicle.tireSet.counts.sessions', { count: usage.sessionCount, formatted: formatNumber(usage.sessionCount) })}</dd></div>
                    </dl>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showEditor}
        onCancel={() => setShowEditor(false)}
        onOk={() => void save()}
        confirmLoading={saving}
        title={t(editing ? 'vehicle.tireSet.editor.editTitle' : 'vehicle.tireSet.editor.addTitle')}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="code" label={t('vehicle.tireSet.fields.code')} rules={[{ required: true }]}><Input placeholder={t('vehicle.tireSet.placeholders.code')} maxLength={40} /></Form.Item>
            <Form.Item name="status" label={t('vehicle.tireSet.fields.status')} rules={[{ required: true }]}><Select options={statusOptions} /></Form.Item>
            <Form.Item name="manufacturer" label={t('vehicle.tireSet.fields.manufacturer')} rules={[{ required: true }]}><Input placeholder={t('vehicle.tireSet.placeholders.manufacturer')} maxLength={60} /></Form.Item>
            <Form.Item name="productName" label={t('vehicle.tireSet.fields.productName')} rules={[{ required: true }]}><Input placeholder={t('vehicle.tireSet.placeholders.productName')} maxLength={80} /></Form.Item>
            <Form.Item name="compound" label={t('vehicle.tireSet.fields.compound')}><Input placeholder={t('vehicle.tireSet.placeholders.compound')} maxLength={40} /></Form.Item>
            <Form.Item name="startedAt" label={t('vehicle.tireSet.fields.startedAt')}><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="frontSize" label={t('vehicle.tireSet.fields.frontSize')}><Input placeholder="205/50R15" maxLength={40} /></Form.Item>
            <Form.Item name="rearSize" label={t('vehicle.tireSet.fields.rearSize')}><Input placeholder="205/50R15" maxLength={40} /></Form.Item>
            <Form.Item name="initialDistanceKm" label={t('vehicle.tireSet.fields.initialDistance')}><InputNumber min={0} max={100000} addonAfter="km" className="w-full" /></Form.Item>
            <Form.Item name="initialLaps" label={t('vehicle.tireSet.fields.initialLaps')}><InputNumber min={0} max={100000} addonAfter={t('vehicle.tireSet.units.laps')} className="w-full" /></Form.Item>
            <Form.Item name="initialHeatCycles" label={t('vehicle.tireSet.fields.initialHeatCycles')}><InputNumber min={0} max={10000} addonAfter={t('vehicle.tireSet.units.times')} className="w-full" /></Form.Item>
          </div>
          <Form.Item name="notes" label={t('vehicle.tireSet.fields.notes')}><Input.TextArea rows={2} maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
