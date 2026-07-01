import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { vehicleProfileSchema } from '../schemas/vehicleProfileSchema';
import type { ModificationEntry, Vehicle, VehicleProfile } from '../types/vehicle';

const COLLECTION_NAME = 'vehicles';

const hasJapaneseText = (message: string) => /[ぁ-んァ-ン一-龥]/.test(message);

const validateVehicleProfile = (profile: unknown): VehicleProfile => {
  const result = vehicleProfileSchema.safeParse(profile);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'profile';
        const message = hasJapaneseText(issue.message) ? issue.message : '入力値を確認してください';
        return `${path}: ${message}`;
      })
      .join(' / ');

    throw new Error(`車両プロフィールの入力内容に誤りがあります。${details}`);
  }

  return result.data;
};

const prepareVehicleData = <T extends Partial<Vehicle>>(vehicleData: T): T => {
  if (!('profile' in vehicleData) || vehicleData.profile === undefined) {
    return vehicleData;
  }

  return {
    ...vehicleData,
    profile: validateVehicleProfile(vehicleData.profile),
  };
};

const cleanVehicleData = (vehicleData: Partial<Vehicle>): Record<string, unknown> => {
  // undefined と空文字を除外する。profile の中の null は落とさない。
  return Object.entries(vehicleData).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key === 'photoURL') {
      // photoURLは空文字列でも保持
      acc[key] = value || '';
    } else if (value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const toNullableDate = (value: unknown): Date | null => {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'object' || value === null || !('toDate' in value)) return null;

  const toDate = (value as { toDate?: unknown }).toDate;
  return typeof toDate === 'function' ? toDate.call(value) : null;
};

const toDateWithFallback = (value: unknown): Date => toNullableDate(value) ?? new Date();

const restoreVehicleProfileDates = (profile: unknown): VehicleProfile | undefined => {
  if (!profile || typeof profile !== 'object') return undefined;

  const profileRecord = profile as VehicleProfile & { modifications?: unknown };
  if (!Array.isArray(profileRecord.modifications)) return profileRecord as VehicleProfile;

  return {
    ...profileRecord,
    modifications: profileRecord.modifications.map((modification) => {
      const modificationRecord = modification as ModificationEntry & {
        installedAt: unknown;
        removedAt: unknown;
      };

      return {
        ...modificationRecord,
        installedAt: toNullableDate(modificationRecord.installedAt),
        removedAt: toNullableDate(modificationRecord.removedAt),
      };
    }),
  };
};

const buildVehicleFromFirestore = (id: string, data: Record<string, unknown>): Vehicle => {
  const profile = restoreVehicleProfileDates(data.profile);

  return {
    id,
    ...data,
    ...(profile !== undefined ? { profile } : {}),
    createdAt: toDateWithFallback(data.createdAt),
    updatedAt: toDateWithFallback(data.updatedAt)
  } as Vehicle;
};

// 車両を追加
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const cleanedData = cleanVehicleData(prepareVehicleData(vehicleData));
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding vehicle:', error);
    throw error;
  }
};

// 車両を更新
export const updateVehicle = async (vehicleId: string, vehicleData: Partial<Vehicle>): Promise<void> => {
  try {
    const cleanedData = cleanVehicleData(prepareVehicleData(vehicleData));
    
    const vehicleRef = doc(db, COLLECTION_NAME, vehicleId);
    await updateDoc(vehicleRef, {
      ...cleanedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

// 車両を削除（論理削除）
export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    const vehicleRef = doc(db, COLLECTION_NAME, vehicleId);
    await updateDoc(vehicleRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

// 車両を物理削除
export const permanentlyDeleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    const vehicleRef = doc(db, COLLECTION_NAME, vehicleId);
    // Base64画像はFirestoreに直接保存されているため、
    // 車両ドキュメントを削除するだけでOK
    await deleteDoc(vehicleRef);
  } catch (error) {
    console.error('Error permanently deleting vehicle:', error);
    throw error;
  }
};

// ユーザーの車両一覧を取得
export const getUserVehicles = async (userId: string, includeInactive = false): Promise<Vehicle[]> => {
  try {
    // シンプルなクエリに変更（インデックス不要）
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const vehicles: Vehicle[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const vehicle = buildVehicleFromFirestore(doc.id, data);
      
      // クライアント側でフィルタリング
      if (includeInactive || vehicle.isActive !== false) {
        vehicles.push(vehicle);
      }
    });
    
    // クライアント側でソート（新しい順）
    vehicles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return vehicles;
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    throw error;
  }
};

// 特定の車両を取得
export const getVehicle = async (vehicleId: string): Promise<Vehicle | null> => {
  try {
    const vehicleRef = doc(db, COLLECTION_NAME, vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    
    if (!vehicleDoc.exists()) {
      return null;
    }
    
    const data = vehicleDoc.data();
    return buildVehicleFromFirestore(vehicleDoc.id, data);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    throw error;
  }
};

// デフォルトのセットアップ設定を生成
export const generateDefaultSetupConfig = () => {
  return {
    suspension: {
      damperAdjustable: false,
      heightAdjustable: false,
      springRateChangeable: false,
      antiRollBarAdjustable: false
    },
    alignment: {
      camberAdjustable: false,
      toeAdjustable: false,
      casterAdjustable: false
    },
    tire: {
      frontSize: [],
      rearSize: []
    },
    brake: {
      padTypes: []
    }
  };
};
