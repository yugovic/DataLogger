import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, Tabs, message, Divider, Upload, DatePicker, Tag } from 'antd';
import { CarOutlined, PlusOutlined, LoadingOutlined, DeleteOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { estimateModLevel, MOD_LEVEL_LABELS } from '../../lib/modLevel';
import { vehicleProfileSchema } from '../../schemas/vehicleProfileSchema';
import { addVehicle, updateVehicle, generateDefaultSetupConfig } from '../../services/vehicleService';
import { MOD_CATEGORY_LABELS, TIRE_CLASS_LABELS, Vehicle, VehicleProfile } from '../../types/vehicle';
import { useAuth } from '../../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
// Cloud Storageは使わず、FirestoreにBase64(Data URL)で保存します

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
  const makeDataUrlUnder = async (file: File, targetBytes = 500 * 1024) => {
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
      message.loading('画像をアップロード中です。完了までお待ちください…');
      return;
    }

    setLoading(true);
    try {
      // photoURLを確実に含める
      const photoURL = form.getFieldValue('photoURL') || values.photoURL || '';

      // Data URLの場合は0.5MB（≈512,000B）超過をブロック
      if (typeof photoURL === 'string' && photoURL.startsWith('data:')) {
        const approx = estimateBase64Bytes(photoURL);
        if (approx > 500 * 1024) {
          message.error('画像サイズが大きすぎます（0.5MB以下にしてください）');
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
          .map((issue) => issue.message)
          .join(' / ');
        form.setFields([{ name: ['profile'], errors: [errorMessage] }]);
        setActiveTab('profile');
        message.error('プロフィールの入力内容を確認してください');
        setLoading(false);
        return;
      }

      const shouldSaveProfile = hasProfileContent(profileValidation.data) || vehicle?.profile !== undefined;
      const vehicleData = {
        ...values,
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
        message.success('車両情報を更新しました');
      } else {
        await addVehicle(vehicleData);
        message.success('車両を追加しました');
      }
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      message.error(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const requestClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: '未保存の変更があります',
        content: '変更を破棄して閉じますか？',
        okText: '破棄',
        cancelText: 'キャンセル',
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
          {vehicle ? '車両を編集' : '車両を追加'}
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
              label: '基本情報',
              children: (
                <>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="make"
                label="メーカー"
                rules={[{ required: true, message: 'メーカーを入力してください' }]}
              >
                <Select placeholder="選択してください">
                  <Select.Option value="Honda">Honda</Select.Option>
                  <Select.Option value="Toyota">Toyota</Select.Option>
                  <Select.Option value="Nissan">Nissan</Select.Option>
                  <Select.Option value="Mazda">Mazda</Select.Option>
                  <Select.Option value="Subaru">Subaru</Select.Option>
                  <Select.Option value="Mitsubishi">Mitsubishi</Select.Option>
                  <Select.Option value="Suzuki">Suzuki</Select.Option>
                  <Select.Option value="Other">その他</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="model"
                label="モデル"
                rules={[{ required: true, message: 'モデルを入力してください' }]}
              >
                <Input placeholder="例: S2000, Supra" autoFocus />
              </Form.Item>

              <Form.Item
                name="year"
                label="年式"
                rules={[{ required: true, message: '年式を入力してください' }]}
              >
                <InputNumber
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  placeholder="2023"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="grade" label="グレード">
                <Input placeholder="例: Type R, RZ" />
              </Form.Item>

              <Form.Item name="vin" label="VINコード">
                <Input placeholder="17桁の車両識別番号" />
              </Form.Item>

              <Form.Item name="licensePlate" label="ナンバープレート">
                <Input placeholder="例: 品川 330 あ 12-34" />
              </Form.Item>

              <Form.Item name="color" label="色">
                <Input placeholder="例: チャンピオンシップホワイト" />
              </Form.Item>

              <Form.Item name="mileage" label="走行距離 (km)">
                <InputNumber
                  min={0}
                  placeholder="50000"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="engineType" label="エンジン型式">
                <Input placeholder="例: F20C, 2JZ-GTE" />
              </Form.Item>

              <Form.Item name="transmission" label="トランスミッション">
                <Select placeholder="選択してください">
                  <Select.Option value="6MT">6速MT</Select.Option>
                  <Select.Option value="5MT">5速MT</Select.Option>
                  <Select.Option value="AT">AT</Select.Option>
                  <Select.Option value="CVT">CVT</Select.Option>
                  <Select.Option value="DCT">DCT</Select.Option>
                  <Select.Option value="Sequential">シーケンシャル</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="drivetrain" label="駆動方式">
                <Select placeholder="選択してください">
                  <Select.Option value="FR">FR（後輪駆動）</Select.Option>
                  <Select.Option value="FF">FF（前輪駆動）</Select.Option>
                  <Select.Option value="4WD">4WD（四輪駆動）</Select.Option>
                  <Select.Option value="AWD">AWD（全輪駆動）</Select.Option>
                  <Select.Option value="MR">MR（ミッドシップ）</Select.Option>
                  <Select.Option value="RR">RR（リアエンジン）</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="notes" label="備考">
              <Input.TextArea
                rows={3}
                placeholder="車両に関する特記事項があれば入力してください"
              />
            </Form.Item>

            <Form.Item name="photoURL" label="車両写真URL" style={{ display: 'none' }}>
              <Input />
            </Form.Item>
            
            <Form.Item label="車両写真">
              <Upload
                listType="picture-card"
                fileList={fileList}
                maxCount={1}
                accept="image/*"
                beforeUpload={(file) => {
                  // ファイルサイズチェック (0.5MB以下)
                  const isLtHalfM = file.size <= 500 * 1024; // 512,000バイト相当
                  if (!isLtHalfM) {
                    message.error('画像サイズは0.5MB以下にしてください');
                    return false;
                  }
                  
                  // 画像タイプチェック
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error('画像ファイルを選択してください');
                    return false;
                  }
                  // バリデーションOKならアップロードを進める（customRequestが呼ばれる）
                  return true;
                }}
                customRequest={async ({ file, onSuccess, onError }) => {
                  if (!currentUser) {
                    message.error('ログインしていません');
                    onError?.(new Error('ユーザーがログインしていません'));
                    return;
                  }
                  
                  const uploadFile = file as File;
                  setUploading(true);
                  
                  console.log('Debug - File to upload:', uploadFile);
                  console.log('Debug - File size:', uploadFile.size, 'bytes');
                  console.log('Debug - File type:', uploadFile.type);
                  
                  try {
                    // Cloud Storageは使わず、Base64(Data URL)でFirestoreに保存
                    // 0.5MB以下を目標に圧縮
                    const dataUrl = await makeDataUrlUnder(uploadFile, 500 * 1024);
                    const approxBytes = estimateBase64Bytes(dataUrl);
                    console.log('Debug - DataURL approx bytes:', approxBytes);
                    if (approxBytes > 500 * 1024) {
                      message.error('画像が大きすぎます。0.5MB以下の画像を選択してください。');
                      setUploading(false);
                      onError?.(new Error('Image exceeds 0.5MB'));
                      return;
                    }
                    form.setFieldsValue({ photoURL: dataUrl });
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
                    
                    message.success('画像をアップロードしました');
                    setUploading(false);
                    onSuccess?.('OK');
                  } catch (error) {
                    console.error('Upload error:', error);
                    message.error('画像のアップロードに失敗しました');
                    setUploading(false);
                    onError?.(error as Error);
                  }
                }}
                onRemove={() => {
                  form.setFieldsValue({ photoURL: '' });
                  setFileList([]);
                  setImageMeta(null);
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
                    <div style={{ marginTop: 8 }}>アップロード</div>
                  </div>
                )}
              </Upload>
              {imageMeta && (
                <div className="text-xs text-gray-500 mt-1">
                  解像度: {imageMeta.w}×{imageMeta.h}px / 容量: {(imageMeta.bytes/1024).toFixed(0)}KB
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ※ 画像サイズは0.5MB以下にしてください
              </div>
            </Form.Item>

            <Form.Item name="isActive" valuePropName="checked">
              <Switch checkedChildren="アクティブ" unCheckedChildren="非アクティブ" />
            </Form.Item>
                </>
              )
            },
            {
              key: 'profile',
              label: 'チューニング',
              children: (
                <div className="space-y-6">
                  <div className="rounded-lg border border-blue-100 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-900/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">改造度プレビュー</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">現在装着中のカテゴリから自動推定されます</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${modLevelClass(previewModLevel)}`}>
                        {MOD_LEVEL_LABELS[previewModLevel]}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">改造パーツリスト</h3>
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
                                      パーツ {field.name + 1}
                                    </span>
                                    {isRemoved && <Tag color="default">取外し済み</Tag>}
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
                                        取外しを戻す
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
                                        取外し
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
                                      削除
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <Form.Item
                                    name={[field.name, 'category']}
                                    label="カテゴリ"
                                    rules={[{ required: true, message: 'カテゴリを選択してください' }]}
                                  >
                                    <Select
                                      options={Object.entries(MOD_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'partName']}
                                    label="パーツ名"
                                    rules={[{ required: true, message: 'パーツ名を入力してください' }]}
                                  >
                                    <Input placeholder="例: 車高調キット" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'maker']} label="メーカー">
                                    <Input placeholder="未入力" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'installedAt']} label="装着日">
                                    <DatePicker className="w-full" placeholder="未入力" />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'costJPY']}
                                    label="費用"
                                    extra="非公開（共有時に含まれません）"
                                  >
                                    <InputNumber min={0} max={10000000} className="w-full" placeholder="未入力" addonAfter="円" />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'memo']}
                                    label="メモ"
                                    extra="非公開（共有時に含まれません）"
                                  >
                                    <Input.TextArea rows={2} placeholder="未入力" />
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
                            改造パーツを追加
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Form.Item name={['profile', 'tireClass']} label="タイヤ区分">
                      <Select
                        allowClear
                        placeholder="未選択"
                        options={Object.entries(TIRE_CLASS_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={['profile', 'powerPs']}
                      label="パワー"
                      extra="自己申告値として表示されます"
                    >
                      <InputNumber min={0} max={2000} className="w-full" placeholder="未入力" addonAfter="ps" />
                    </Form.Item>
                    <Form.Item
                      name={['profile', 'weightKg']}
                      label="車重"
                      extra="自己申告値として表示されます"
                    >
                      <InputNumber min={300} max={3500} className="w-full" placeholder="未入力" addonAfter="kg" />
                    </Form.Item>
                  </div>
                </div>
              )
            },
            {
              key: 'setup',
              label: 'セッティング項目',
              children: (
                <>
            <div className="space-y-6">
              {/* サスペンション設定 */}
              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">サスペンション設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">ダンパー調整機能</span>
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
                            label="フロントダンパー段数"
                          >
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item
                            name={['setupConfig', 'suspension', 'damperClicksRear']}
                            label="リアダンパー段数"
                          >
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                          </Form.Item>
                        </div>
                      )
                    }
                  </Form.Item>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">車高調整機能</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'heightAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">スプリングレート変更可能</span>
                    <Form.Item
                      name={['setupConfig', 'suspension', 'springRateChangeable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">スタビライザー調整機能</span>
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
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">アライメント設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">キャンバー調整機能</span>
                    <Form.Item
                      name={['setupConfig', 'alignment', 'camberAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">トー調整機能</span>
                    <Form.Item
                      name={['setupConfig', 'alignment', 'toeAdjustable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">キャスター調整機能</span>
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

              {/* エンジン設定 */}
              <div>
                <h3 className="text-lg font-medium mb-3 dark:text-gray-200">エンジン設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">ECUチューニング可能</span>
                    <Form.Item
                      name={['setupConfig', 'engine', 'ecuTunable']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="dark:text-gray-300">ブースト圧調整可能</span>
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
            </div>
                </>
              )
            }
          ]}
        />

        <div className="flex justify-end mt-6 space-x-2">
          <Button onClick={requestClose}>
            キャンセル
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} disabled={uploading}>
            {vehicle ? '更新' : '追加'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
