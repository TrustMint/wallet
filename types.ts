
export enum UserRole {
  SENDER = 'SENDER',
  COURIER = 'COURIER',
  UNSET = 'UNSET'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  NEGOTIATING = 'NEGOTIATING',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface CounterOffer {
  courierId: string;
  courierName: string;
  proposedPrice: number;
  timestamp: number;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Order {
  id: string;
  senderId: string;
  courierId?: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLocation?: Coordinates; // GPS of pickup
  deliveryLocation?: Coordinates; // GPS of delivery
  price: number;
  weight: string;
  status: OrderStatus;
  createdAt: number;
  completedAt?: number;
  paymentMethod: 'card' | 'cash';
  counterOffers: CounterOffer[];
  options?: string[]; 
  isReviewed?: boolean; 
  cancellationReason?: string; // New field
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  text: string;
  avatarColor: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  title: string;
  address: string;
  location?: Coordinates;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'commission_pay' | 'withdrawal' | 'penalty' | 'refund';
  description: string;
  createdAt: number;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: number;
  // Reply context
  replyTo?: {
      id: string;
      senderId: string;
      text: string | null;
      imageUrl: string | null;
  } | null;
  // Optimistic UI flag
  isSending?: boolean;
  isError?: boolean;
}

export type ViewType = 
  | 'DASHBOARD' 
  | 'CREATE_ORDER' 
  | 'ORDERS_LIST' 
  | 'HISTORY'
  | 'PROFILE' 
  | 'CHAT' 
  | 'WALLET' 
  | 'ORDER_DETAIL' 
  | 'RATING' 
  | 'ACTIVE_ORDERS'
  // Profile Subpages
  | 'PROFILE_PERSONAL'
  | 'PROFILE_DOCS'
  | 'PROFILE_SECURITY'
  | 'PROFILE_SUPPORT'
  | 'PROFILE_CITY'
  | 'PROFILE_NAVIGATION'
  // Sender Profile Subpages
  | 'PROFILE_PAYMENT_METHODS'
  | 'PROFILE_SAVED_ADDRESSES';

export interface AppState {
  user: User | null;
  orders: Order[];
  currentView: ViewType;
  viewStack: ViewType[];
  selectedOrderId: string | null;
}

export interface UserLocation {
  lat: number;
  lng: number;
  lastUpdated: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  rating: number;
  walletBalance: number;
  commissionDebt: number;
  phone?: string; 
  email?: string; 
  location?: UserLocation; 
  city?: string; 
  status?: 'active' | 'busy'; 
  pushToken?: string; // For notifications
  isVerified?: boolean; // New field from DB
}
