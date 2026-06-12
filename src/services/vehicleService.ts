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
import { Vehicle } from '../types/vehicle';

const COLLECTION_NAME = 'vehicles';

// 車両を追加
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // undefinedを除外（photoURLは空文字列でも保持）
    const cleanedData = Object.entries(vehicleData).reduce((acc, [key, value]) => {
      if (key === 'photoURL') {
        // photoURLは空文字列でも保持
        acc[key] = value || '';
      } else if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
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
    // undefinedを除外（photoURLは空文字列でも保持）
    const cleanedData = Object.entries(vehicleData).reduce((acc, [key, value]) => {
      if (key === 'photoURL') {
        // photoURLは空文字列でも保持
        acc[key] = value || '';
      } else if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
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
      const vehicle = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Vehicle;
      
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
    return {
      id: vehicleDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Vehicle;
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
