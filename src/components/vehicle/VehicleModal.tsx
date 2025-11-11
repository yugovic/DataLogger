import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, Tabs, message, Divider, Upload } from 'antd';
import { UploadOutlined, CarOutlined, PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { Vehicle, VehicleSetupConfig } from '../../types/vehicle';
import { addVehicle, updateVehicle, generateDefaultSetupConfig } from '../../services/vehicleService';
import { useAuth } from '../../contexts/AuthContext';
import type { UploadFile } from 'antd/es/upload/interface';
// Cloud Storageは使わず、FirestoreにBase64(Data URL)で保存します


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
        form.setFieldsValue(vehicle);
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
          setupConfig: generateDefaultSetupConfig()
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
      
      const vehicleData = {
        ...values,
        photoURL,
        userId: currentUser.uid,
      };
      
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
      message.error('保存に失敗しました');
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
