import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, Tabs, message, Divider, Upload, DatePicker, Tag } from 'antd';
import { CarOutlined, PlusOutlined, LoadingOutlined, DeleteOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { estimateModLevel } from '../../lib/modLevel';
import { vehicleProfileSchema } from '../../schemas/vehicleProfileSchema';
import { AppError, resolveAppErrorMessage, resolveZodMessage } from '../../i18n/errorMessages';
import { addVehicle, updateVehicle, generateDefaultSetupConfig } from '../../services/vehicleService';
import { MOD_CATEGORY_LABELS, TIRE_CLASS_LABELS, Vehicle, VehicleProfile } from '../../types/vehicle';
import type { SetupAdjustmentDefinition } from '../../types/vehicle';
import {
  ADJUSTMENT_GROUP_LABELS,
  ADJUSTMENT_POSITION_LABELS,
  ADJUSTMENT_VALUE_TYPE_LABELS,
  normalizeAdjustmentDefinitions,
} from '../../lib/setupAdjustments';
import { useAuth } from '../../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
import { useTranslation } from 'react-i18next';
// Cloud Storageは使わず、FirestoreにBase64(Data URL)で保存します

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
// Firestore ドキュメントの 1 MiB 制限と Base64 の約 4/3 倍の膨張を考慮し、
// 車両画像は他フィールド分の余裕を残した 400 KiB 以下にする。
const TARGET_IMAGE_BYTES = 400 * 1024;

interface ProfileFormModification {
  id?: string;
  category?: VehicleProfile['modifications'][number]['category'];
  partName?: string;
  maker?: string | null;
  installedAt?: Dayjs | Date | null;
  removedAt?: Dayjs | Date | null;
  costJPY?: number | null;
  memo?: string | null;
}

interface ProfileFormValue {
  modifications?: ProfileFormModification[];
  tireClass?: VehicleProfile['tireClass'];
  powerPs?: number | null;
  weightKg?: number | null;
}

const emptyProfileFormValue = (): ProfileFormValue => ({
  modifications: [],
  tireClass: null,
  powerPs: null,
  weightKg: null,
});

const toFormDate = (value: Date | null): Dayjs | null => (value ? dayjs(value) : null);

const vehicleProfileToFormValue = (profile?: VehicleProfile): ProfileFormValue => {
  if (!profile) return emptyProfileFormValue();

  return {
    ...profile,
    modifications: profile.modifications.map((modification) => ({
      ...modification,
      installedAt: toFormDate(modification.installedAt),
      removedAt: toFormDate(modification.removedAt),
    })),
  };
};

const toDateOrNull = (value: Dayjs | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
};

const toNullableText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeProfileFormValue = (value: ProfileFormValue | undefined): VehicleProfile => ({
  modifications: (value?.modifications ?? []).map((modification) => ({
    id: modification.id || crypto.randomUUID(),
    category: modification.category ?? 'other',
    partName: modification.partName?.trim() ?? '',
    maker: toNullableText(modification.maker),
    installedAt: toDateOrNull(modification.installedAt),
    removedAt: toDateOrNull(modification.removedAt),
    costJPY: modification.costJPY ?? null,
    memo: toNullableText(modification.memo),
  })),
  tireClass: value?.tireClass ?? null,
  powerPs: value?.powerPs ?? null,
  weightKg: value?.weightKg ?? null,
});

const hasProfileContent = (profile: VehicleProfile): boolean =>
  profile.modifications.length > 0 ||
  profile.tireClass !== null ||
  profile.powerPs !== null ||
  profile.weightKg !== null;

const modLevelClass = (level: ReturnType<typeof estimateModLevel>): string => {
  switch (level) {
    case 'NORMAL':
      return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    case 'LIGHT':
      return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700';
    case 'MIDDLE':
      return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700';
    case 'FULL':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  }
};

interface VehicleModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({ visible, onClose, vehicle }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const modCategoryOptions = useMemo(() => Object.keys(MOD_CATEGORY_LABELS).map((value) => ({ value, label: t(`vehicle.labels.modCategory.${value}`) })), [t]);
  const tireClassOptions = useMemo(() => Object.keys(TIRE_CLASS_LABELS).map((value) => ({ value, label: t(`vehicle.labels.tireClass.${value}`) })), [t]);
  const adjustmentGroupOptions = useMemo(() => Object.keys(ADJUSTMENT_GROUP_LABELS).map((value) => ({ value, label: t(`vehicle.labels.adjustmentGroup.${value}`) })), [t]);
  const adjustmentPositionOptions = useMemo(() => Object.keys(ADJUSTMENT_POSITION_LABELS).map((value) => ({ value, label: t(`vehicle.labels.adjustmentPosition.${value}`) })), [t]);
  const adjustmentValueTypeOptions = useMemo(() => Object.keys(ADJUSTMENT_VALUE_TYPE_LABELS).map((value) => ({ value, label: t(`vehicle.labels.adjustmentValueType.${value}`) })), [t]);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [imageMeta, setImageMeta] = useState<{w:number; h:number; bytes:number} | null>(null);
  const watchedProfile = Form.useWatch('profile', form) as ProfileFormValue | undefined;
  const previewProfile = normalizeProfileFormValue(watchedProfile);
  const previewModLevel = estimateModLevel(previewProfile.modifications);

  // Base64長からおおよそのバイト数を推定
  const estimateBase64Bytes = (dataUrl: string) => {
    const base64 = dataUrl.split(',')[1] || '';
    return Math.ceil((base64.length * 3) / 4);
  };

  // 画像を指定の最大辺・品質で圧縮してData URLを返す
  const compressImageToDataURL = (file: File, maxDim = 1280, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h >= w && h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      const reader = new FileReader();
      reader.onload = () => {
        img.src = String(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 目標サイズ以下になるまで数回圧縮
  const makeDataUrlUnder = async (file: File, targetBytes = TARGET_IMAGE_BYTES) => {
    const attempts: Array<{ dim: number; q: number }> = [
      { dim: 1600, q: 0.75 },
      { dim: 1280, q: 0.7 },
      { dim: 1024, q: 0.65 },
      { dim: 960, q: 0.6 },
      { dim: 800, q: 0.6 },
      { dim: 720, q: 0.55 },
    ];
    let last = '';
    for (const a of attempts) {
      const dataUrl = await compressImageToDataURL(file, a.dim, a.q);
      last = dataUrl;
      if (estimateBase64Bytes(dataUrl) <= targetBytes) return dataUrl;
    }
    return last;
  };

  useEffect(() => {
    if (visible) {
      setIsDirty(false);
      if (vehicle) {
        form.setFieldsValue({
          ...vehicle,
          profile: vehicleProfileToFormValue(vehicle.profile),
        });
        // 既存の画像がある場合、ファイルリストに設定
        if (vehicle.photoURL) {
          setFileList([{
            uid: '-1',
            name: 'vehicle-photo.jpg',
            status: 'done',
            url: vehicle.photoURL,
          }]);
        } else {
          setFileList([]);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
          setupConfig: generateDefaultSetupConfig(),
          profile: emptyProfileFormValue(),
        });
        setFileList([]);
      }
      setActiveTab('basic');
    }
  }, [visible, vehicle, form]);

  // 未保存離脱のガード
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSubmit = async (values: any) => {
    if (!currentUser) return;

    // 画像アップロード中は保存をブロック
    if (uploading) {
      message.loading(t('vehicle.modal.image.uploading'));
      return;
    }

    setLoading(true);
    try {
      // photoURLを確実に含める
      const photoURL = form.getFieldValue('photoURL') || values.photoURL || '';

      // Data URL は Firestore ドキュメント容量に余裕を残すため 400 KiB 超過をブロック
      if (typeof photoURL === 'string' && photoURL.startsWith('data:')) {
        const approx = estimateBase64Bytes(photoURL);
        if (approx > TARGET_IMAGE_BYTES) {
          message.error(t('vehicle.modal.image.tooLarge'));
          setLoading(false);
          return;
        }
      }
      
      console.log('Debug - Form values:', values);
      console.log('Debug - photoURL from form:', form.getFieldValue('photoURL'));
      console.log('Debug - Final photoURL:', photoURL);
      
      const normalizedProfile = normalizeProfileFormValue(values.profile);
      const profileValidation = vehicleProfileSchema.safeParse(normalizedProfile);
      if (!profileValidation.success) {
        const errorMessage = profileValidation.error.issues
          .map((issue) => resolveZodMessage(issue.message, t))
          .join(' / ');
        form.setFields([{ name: ['profile'], errors: [errorMessage] }]);
        setActiveTab('profile');
        message.error(t('vehicle.modal.errors.profile'));
        setLoading(false);
        return;
      }

      const shouldSaveProfile = hasProfileContent(profileValidation.data) || vehicle?.profile !== undefined;
      const normalizedDefinitions = normalizeAdjustmentDefinitions(
        values.setupConfig?.adjustmentDefinitions as SetupAdjustmentDefinition[] | undefined,
      );
      const vehicleData = {
        ...values,
        setupConfig: {
          ...values.setupConfig,
          adjustmentDefinitions: normalizedDefinitions,
        },
        photoURL,
        userId: currentUser.uid,
        ...(shouldSaveProfile ? { profile: profileValidation.data } : {}),
      };
      if (!shouldSaveProfile) {
        delete vehicleData.profile;
      }
      
      console.log('Debug - Vehicle data to save:', vehicleData);

      if (vehicle?.id) {
        await updateVehicle(vehicle.id, vehicleData);
        message.success(t('vehicle.modal.success.updated'));
      } else {
        await addVehicle(vehicleData);
        message.success(t('vehicle.modal.success.created'));
      }
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      message.error(error instanceof AppError ? resolveAppErrorMessage(error, t) : t('vehicle.modal.errors.save'));
    } finally {
      setLoading(false);
    }
  };

  const requestClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: t('common.unsaved.title'),
        content: t('vehicle.modal.unsaved.content'),
        okText: t('vehicle.modal.unsaved.discard'),
        cancelText: t('common.cancel'),
        onOk: () => onClose(),
      });
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <CarOutlined className="mr-2" />
          {t(vehicle ? 'vehicle.modal.title.edit' : 'vehicle.modal.title.add')}
        </div>
      }
      open={visible}
      onCancel={requestClose}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={() => setIsDirty(true)}
        onFinishFailed={({ errorFields }) => {
          if (errorFields && errorFields[0]) {
            form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
          }
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: t('vehicle.modal.tabs.basic'),
              children: (
                <>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="make"
                label={t('vehicle.modal.fields.make')}
                rules={[{ required: true, message: t('vehicle.modal.validation.make') }]}
              >
                <Select placeholder={t('common.select')}>
                  <Select.Option value="Honda">Honda</Select.Option>
                  <Select.Option value="Toyota">Toyota</Select.Option>
                  <Select.Option value="Nissan">Nissan</Select.Option>
                  <Select.Option value="Mazda">Mazda</Select.Option>
                  <Select.Option value="Subaru">Subaru</Select.Option>
                  <Select.Option value="Mitsubishi">Mitsubishi</Select.Option>
                  <Select.Option value="Suzuki">Suzuki</Select.Option>
                  <Select.Option value="Other">{t('common.other')}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="model"
                label={t('vehicle.modal.fields.model')}
                rules={[{ required: true, message: t('vehicle.modal.validation.model') }]}
              >
                <Input placeholder={t('vehicle.modal.placeholders.model')} autoFocus />
              </Form.Item>

              <Form.Item
                name="year"
                label={t('vehicle.modal.fields.year')}
                rules={[{ required: true, message: t('vehicle.modal.validation.year') }]}
              >
                <InputNumber
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  placeholder="2023"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="grade" label={t('vehicle.modal.fields.grade')}>
                <Input placeholder={t('vehicle.modal.placeholders.grade')} />
              </Form.Item>

              <Form.Item name="vin" label={t('vehicle.modal.fields.vin')}>
                <Input placeholder={t('vehicle.modal.placeholders.vin')} />
              </Form.Item>

              <Form.Item name="licensePlate" label={t('vehicle.modal.fields.licensePlate')}>
                <Input placeholder={t('vehicle.modal.placeholders.licensePlate')} />
              </Form.Item>

              <Form.Item name="color" label={t('vehicle.modal.fields.color')}>
                <Input placeholder={t('vehicle.modal.placeholders.color')} />
              </Form.Item>

              <Form.Item name="mileage" label={t('vehicle.modal.fields.mileage')}>
                <InputNumber
                  min={0}
                  placeholder="50000"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="engineType" label={t('vehicle.modal.fields.engineType')}>
                <Input placeholder={t('vehicle.modal.placeholders.engineType')} />
              </Form.Item>

              <Form.Item name="transmission" label={t('vehicle.modal.fields.transmission')}>
                <Select placeholder={t('common.select')}>
                  <Select.Option value="6MT">{t('vehicle.modal.transmission.6MT')}</Select.Option>
                  <Select.Option value="5MT">{t('vehicle.modal.transmission.5MT')}</Select.Option>
                  <Select.Option value="AT">AT</Select.Option>
                  <Select.Option value="CVT">CVT</Select.Option>
                  <Select.Option value="DCT">DCT</Select.Option>
                  <Select.Option value="Sequential">{t('vehicle.modal.transmission.sequential')}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="drivetrain" label={t('vehicle.modal.fields.drivetrain')}>
                <Select placeholder={t('common.select')}>
                  {(['FR', 'FF', '4WD', 'AWD', 'MR', 'RR'] as const).map((code) => <Select.Option key={code} value={code}>{t(`vehicle.modal.drivetrain.${code}`)}</Select.Option>)}
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="notes" label={t('vehicle.modal.fields.notes')}>
              <Input.TextArea
                rows={3}
                placeholder={t('vehicle.modal.placeholders.notes')}
              />
            </Form.Item>

            <Form.Item name="photoURL" label={t('vehicle.modal.fields.photoURL')} style={{ display: 'none' }}>
              <Input />
            </Form.Item>
            
            <Form.Item label={t('vehicle.modal.fields.photo')}>
              <Upload
                listType="picture-card"
                fileList={fileList}
                maxCount={1}
                accept="image/*"
                beforeUpload={(file) => {
                  // 画像タイプチェック
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error(t('vehicle.modal.image.invalidType'));
                    return false;
                  }

                  // 極端に大きな元画像だけを先に拒否し、それ以下は customRequest 内で圧縮する。
                  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
                    message.error(t('vehicle.modal.image.sourceTooLarge'));
                    return false;
                  }

                  // バリデーションOKなら圧縮処理へ進む（customRequestが呼ばれる）
                  return true;
                }}
                customRequest={async ({ file, onSuccess, onError }) => {
                  if (!currentUser) {
                    message.error(t('vehicle.modal.errors.notLoggedIn'));
                    onError?.(new Error(t('vehicle.modal.errors.notLoggedIn')));
                    return;
                  }
                  
                  const uploadFile = file as File;
                  setUploading(true);
                  
                  console.log('Debug - File to upload:', uploadFile);
                  console.log('Debug - File size:', uploadFile.size, 'bytes');
                  console.log('Debug - File type:', uploadFile.type);
                  
                  try {
                    // Cloud Storageは使わず、Base64(Data URL)でFirestoreに保存
                    // Firestore ドキュメント容量に余裕を残すため 400KB 以下を目標に圧縮
                    const dataUrl = await makeDataUrlUnder(uploadFile, TARGET_IMAGE_BYTES);
                    const approxBytes = estimateBase64Bytes(dataUrl);
                    console.log('Debug - DataURL approx bytes:', approxBytes);
                    if (approxBytes > TARGET_IMAGE_BYTES) {
                      message.error(t('vehicle.modal.image.compressFailed'));
                      setUploading(false);
                      onError?.(new Error('Image exceeds 400KB after compression'));
                      return;
                    }
                    form.setFieldsValue({ photoURL: dataUrl });
                    setIsDirty(true);
                    // 画像メタ
                    await new Promise<void>((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                        setImageMeta({ w: img.width, h: img.height, bytes: approxBytes });
                        resolve();
                      };
                      img.src = dataUrl;
                    });
                    setFileList([
                      {
                        uid: '-1',
                        name: uploadFile.name,
                        status: 'done',
                        url: dataUrl,
                      } as UploadFile,
                    ]);
                    console.log('Debug - Set photoURL(DataURL) in form:', String(form.getFieldValue('photoURL')).slice(0, 64) + '...');
                    
                    const wasCompressed = uploadFile.size > approxBytes;
                    message.success(t(wasCompressed ? 'vehicle.modal.image.compressed' : 'vehicle.modal.image.uploaded'));
                    setUploading(false);
                    onSuccess?.('OK');
                  } catch (error) {
                    console.error('Upload error:', error);
                    message.error(t('vehicle.modal.image.uploadFailed'));
                    setUploading(false);
                    onError?.(error as Error);
                  }
                }}
                onRemove={() => {
                  form.setFieldsValue({ photoURL: '' });
                  setFileList([]);
                  setImageMeta(null);
                  setIsDirty(true);
                }}
                onChange={({ fileList: newFileList }) => {
                  console.log('Debug - FileList changed:', newFileList);
                  const dataUrl = form.getFieldValue('photoURL');
                  if (dataUrl && newFileList.length > 0) {
                    const last = newFileList[newFileList.length - 1];
                    if (!last.url) {
                      // プレビュー表示用にData URLを付与
                      (last as any).url = dataUrl;
                    }
                  }
                  setFileList(newFileList);
                }}
              >
                {fileList.length === 0 && (
                  <div>
                    {uploading ? (
                      <LoadingOutlined />
                    ) : (
                      <PlusOutlined />
                    )}
                    <div style={{ marginTop: 8 }}>{t('vehicle.modal.image.upload')}</div>
                  </div>
                )}
              </Upload>
              {imageMeta && (
                <div className="text-xs text-gray-500 mt-1">
                  {t('vehicle.modal.image.metadata', { width: imageMeta.w, height: imageMeta.h, size: (imageMeta.bytes/1024).toFixed(0) })}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('vehicle.modal.image.hint')}
              </div>
            </Form.Item>

            <Form.Item name="isActive" valuePropName="checked">
              <Switch checkedChildren={t('vehicle.modal.status.active')} unCheckedChildren={t('vehicle.modal.status.inactive')} />
            </Form.Item>
                </>
              )
            },
            {
              key: 'profile',
              label: t('vehicle.modal.tabs.tuning'),
              children: (
                <div className="space-y-6">
                  <div className="rounded-lg border border-blue-100 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-900/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">{t('vehicle.modal.profile.preview')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('vehicle.modal.profile.previewDescription')}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${modLevelClass(previewModLevel)}`}>
                        {t(`vehicle.labels.modLevel.${previewModLevel}`)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('vehicle.modal.profile.parts')}</h3>
                    </div>
                    <Form.List name={['profile', 'modifications']}>
                      {(fields, { add, remove }) => (
                        <div className="space-y-3">
                          {fields.map((field) => {
                            const removedAt = form.getFieldValue(['profile', 'modifications', field.name, 'removedAt']);
                            const isRemoved = removedAt !== null && removedAt !== undefined;
                            return (
                              <div
                                key={field.key}
                                className={`rounded-lg border p-4 transition-colors ${
                                  isRemoved
                                    ? 'border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-800/60'
                                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                }`}
                              >
                                <Form.Item name={[field.name, 'id']} hidden>
                                  <Input />
                                </Form.Item>
                                <Form.Item name={[field.name, 'removedAt']} hidden>
                                  <DatePicker />
                                </Form.Item>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {t('vehicle.modal.profile.partNumber', { number: field.name + 1 })}
                                    </span>
                                    {isRemoved && <Tag color="default">{t('vehicle.modal.profile.removed')}</Tag>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isRemoved ? (
                                      <Button
                                        size="small"
                                        icon={<UndoOutlined />}
                                        onClick={() => {
                                          form.setFieldValue(['profile', 'modifications', field.name, 'removedAt'], null);
                                          setIsDirty(true);
                                        }}
                                      >
                                        {t('vehicle.modal.profile.restore')}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        icon={<StopOutlined />}
                                        onClick={() => {
                                          form.setFieldValue(['profile', 'modifications', field.name, 'removedAt'], dayjs());
                                          setIsDirty(true);
                                        }}
                                      >
                                        {t('vehicle.modal.profile.remove')}
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => {
                                        remove(field.name);
                                        setIsDirty(true);
                                      }}
                                    >
                                      {t('common.delete')}
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <Form.Item
                                    name={[field.name, 'category']}
                                    label={t('vehicle.modal.profile.category')}
                                    rules={[{ required: true, message: t('vehicle.modal.profile.categoryRequired') }]}
                                  >
                                    <Select
                                      options={modCategoryOptions}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'partName']}
                                    label={t('vehicle.modal.profile.partName')}
                                    rules={[{ required: true, message: t('vehicle.modal.profile.partNameRequired') }]}
                                  >
                                    <Input placeholder={t('vehicle.modal.profile.partNamePlaceholder')} />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'maker']} label={t('vehicle.modal.fields.make')}>
                                    <Input placeholder={t('common.notSet')} />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'installedAt']} label={t('vehicle.modal.profile.installedAt')}>
                                    <DatePicker className="w-full" placeholder={t('common.notSet')} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'costJPY']}
                                    label={t('vehicle.modal.profile.cost')}
                                    extra={t('vehicle.modal.profile.private')}
                                  >
                                    <InputNumber min={0} max={10000000} className="w-full" placeholder={t('common.notSet')} addonAfter={t('vehicle.modal.profile.yen')} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'memo']}
                                    label={t('vehicle.modal.profile.memo')}
                                    extra={t('vehicle.modal.profile.private')}
                                  >
                                    <Input.TextArea rows={2} placeholder={t('common.notSet')} />
                                  </Form.Item>
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            onClick={() => {
                              add({
                                id: crypto.randomUUID(),
                                partName: '',
                                maker: null,
                                installedAt: null,
                                removedAt: null,
                                costJPY: null,
                                memo: null,
                              });
                              setIsDirty(true);
                            }}
                          >
                            {t('vehicle.modal.profile.addPart')}
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Form.Item name={['profile', 'tireClass']} label={t('vehicle.modal.profile.tireClass')}>
                      <Select
                        allowClear
                        placeholder={t('vehicle.modal.profile.notSelected')}
                        options={tireClassOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      name={['profile', 'powerPs']}
                      label={t('vehicle.modal.profile.power')}
                      extra={t('vehicle.modal.profile.selfReported')}
                    >
                      <InputNumber min={0} max={2000} className="w-full" placeholder={t('common.notSet')} addonAfter="ps" />
                    </Form.Item>
                    <Form.Item
                      name={['profile', 'weightKg']}
                      label={t('vehicle.modal.profile.weight')}
                      extra={t('vehicle.modal.profile.selfReported')}
                    >
                      <InputNumber min={300} max={3500} className="w-full" placeholder={t('common.notSet')} addonAfter="kg" />
                    </Form.Item>
                  </div>
                </div>
              )
            },
            {
              key: 'setup',
              label: t('vehicle.modal.tabs.setup'),
              children: (
                <>
            <div className="space-y-6">
              <div>
                <div className="mb-3">
                  <h3 className="text-lg font-medium dark:text-gray-200">{t('vehicle.modal.setup.standard')}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('vehicle.modal.setup.standardDescription')}
                  </p>
                </div>
              </div>

              {/* サスペンション設定 */}
              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">{t('vehicle.modal.setup.suspension')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.damperAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'damperAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.setupConfig?.suspension?.damperAdjustable !==
                      currentValues.setupConfig?.suspension?.damperAdjustable
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue(['setupConfig', 'suspension', 'damperAdjustable']) && (
                        <div className="ml-6 grid grid-cols-2 gap-4">
                          <Form.Item
                            name={['setupConfig', 'suspension', 'damperClicksFront']}
                            label={t('vehicle.modal.setup.frontDamperClicks')}
                          >
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item
                            name={['setupConfig', 'suspension', 'damperClicksRear']}
                            label={t('vehicle.modal.setup.rearDamperClicks')}
                          >
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                          </Form.Item>
                        </div>
                      )
                    }
                  </Form.Item>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.heightAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'heightAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.springRateChangeable')}</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'springRateChangeable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.antiRollBarAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'antiRollBarAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                </div>
              </div>

              <Divider />

              {/* アライメント設定 */}
              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">{t('vehicle.modal.setup.alignment')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.camberAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'alignment', 'camberAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.toeAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'alignment', 'toeAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.casterAdjustable')}</span>
                    <Form.Item
                      name={['setupConfig', 'alignment', 'casterAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="text-lg font-medium mb-1 dark:text-gray-200">{t('vehicle.modal.setup.tireBrake')}</h3>
                <div className="mb-4 flex items-center justify-between rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">{t('vehicle.modal.setup.tireSetManagement')}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('vehicle.modal.setup.tireSetDescription')}</div>
                  </div>
                  <Form.Item name={['setupConfig', 'tire', 'tireSetManagementEnabled']} valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('vehicle.modal.setup.sizeDescription')}</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Form.Item name={['setupConfig', 'tire', 'frontSize']} label={t('vehicle.modal.setup.frontTireSizes')}>
                    <Select mode="tags" placeholder={t('vehicle.modal.setup.frontTirePlaceholder')} tokenSeparators={[',']} />
                  </Form.Item>
                  <Form.Item name={['setupConfig', 'tire', 'rearSize']} label={t('vehicle.modal.setup.rearTireSizes')}>
                    <Select mode="tags" placeholder={t('vehicle.modal.setup.rearTirePlaceholder')} tokenSeparators={[',']} />
                  </Form.Item>
                  <Form.Item name={['setupConfig', 'brake', 'padTypes']} label={t('vehicle.modal.setup.brakePads')}>
                    <Select mode="tags" placeholder={t('vehicle.modal.setup.brakePadPlaceholder')} tokenSeparators={[',']} />
                  </Form.Item>
                  <Form.Item name={['setupConfig', 'brake', 'rotorTypes']} label={t('vehicle.modal.setup.brakeRotors')}>
                    <Select mode="tags" placeholder={t('vehicle.modal.setup.brakeRotorPlaceholder')} tokenSeparators={[',']} />
                  </Form.Item>
                </div>
                <div className="flex items-center justify-between">
                  <span className="dark:text-gray-300">{t('vehicle.modal.setup.brakeBalance')}</span>
                  <Form.Item name={['setupConfig', 'brake', 'balanceAdjustable']} valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">{t('vehicle.modal.setup.aero')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.frontAero')}</span>
                    <Form.Item name={['setupConfig', 'aero', 'frontAdjustable']} valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.rearAero')}</span>
                    <Form.Item name={['setupConfig', 'aero', 'rearAdjustable']} valuePropName="checked" className="mb-0"><Switch /></Form.Item>
                  </div>
                </div>
              </div>

              <Divider />

              {/* エンジン設定 */}
              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">{t('vehicle.modal.setup.engine')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.ecu')}</span>
                    <Form.Item
                      name={['setupConfig', 'engine', 'ecuTunable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">{t('vehicle.modal.setup.boost')}</span>
                    <Form.Item
                      name={['setupConfig', 'engine', 'boostAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <div className="mb-3">
                  <h3 className="text-lg font-medium dark:text-gray-200">{t('vehicle.modal.setup.custom')}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('vehicle.modal.setup.customDescription')}
                  </p>
                </div>
                <Form.List name={['setupConfig', 'adjustmentDefinitions']}>
                  {(fields, { add, remove }) => (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.key} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                          <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                          <Form.Item name={[field.name, 'enabled']} hidden><Switch /></Form.Item>
                          <Form.Item name={[field.name, 'order']} hidden><InputNumber /></Form.Item>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('vehicle.modal.setup.customNumber', { number: index + 1 })}</span>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>{t('common.delete')}</Button>
                          </div>
                          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
                            <Form.Item name={[field.name, 'label']} label={t('vehicle.modal.setup.fields.label')} rules={[{ required: true, message: t('vehicle.modal.setup.labelRequired') }]}>
                              <Input placeholder={t('vehicle.modal.setup.labelPlaceholder')} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'group']} label={t('vehicle.modal.setup.fields.group')} rules={[{ required: true }]}><Select options={adjustmentGroupOptions} /></Form.Item>
                            <Form.Item name={[field.name, 'position']} label={t('vehicle.modal.setup.fields.position')} rules={[{ required: true }]}><Select options={adjustmentPositionOptions} /></Form.Item>
                            <Form.Item name={[field.name, 'valueType']} label={t('vehicle.modal.setup.fields.valueType')} rules={[{ required: true }]}><Select options={adjustmentValueTypeOptions} /></Form.Item>
                            <Form.Item name={[field.name, 'unit']} label={t('vehicle.modal.setup.fields.unit')}><Input placeholder="click / mm / ° / kPa" /></Form.Item>
                            <Form.Item name={[field.name, 'options']} label={t('vehicle.modal.setup.fields.options')}><Select mode="tags" tokenSeparators={[',']} placeholder="Soft, Medium, Hard" /></Form.Item>
                            <Form.Item name={[field.name, 'min']} label={t('vehicle.modal.setup.fields.min')}><InputNumber className="w-full" /></Form.Item>
                            <Form.Item name={[field.name, 'max']} label={t('vehicle.modal.setup.fields.max')}><InputNumber className="w-full" /></Form.Item>
                            <Form.Item name={[field.name, 'step']} label={t('vehicle.modal.setup.fields.step')}><InputNumber className="w-full" min={0.001} /></Form.Item>
                            <Form.Item name={[field.name, 'helpText']} label={t('vehicle.modal.setup.fields.help')}><Input placeholder={t('vehicle.modal.setup.helpPlaceholder')} /></Form.Item>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => add({
                          id: crypto.randomUUID(),
                          group: 'other',
                          label: '',
                          position: 'vehicle',
                          valueType: 'number',
                          enabled: true,
                          order: fields.length,
                        })}
                      >
                        {t('vehicle.modal.setup.addCustom')}
                      </Button>
                    </div>
                  )}
                </Form.List>
              </div>
            </div>
                </>
              )
            }
          ]}
        />

        <div className="flex justify-end mt-6 space-x-2">
          <Button onClick={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} disabled={uploading}>
            {t(vehicle ? 'vehicle.modal.actions.update' : 'vehicle.modal.actions.add')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
