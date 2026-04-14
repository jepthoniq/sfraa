export interface Restaurant {
  id: string;
  name: string;
  ownerId: string;
  slug: string;
  logo?: string;
  currency: "IQD";
  minOrder: number;
  isDeliveryEnabled: boolean;
  whatsappNumber?: string;
  themeColor?: string;
  subscriptionStatus: "active" | "trial" | "expired";
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  image?: string;
  categoryId: string;
  isAvailable: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  type: "dine-in" | "delivery";
  status: "pending" | "preparing" | "out-for-delivery" | "completed" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerZone?: string;
  googleMapsLink?: string;
  tableNumber?: string;
  customerIp?: string;
  notes?: string;
  createdAt: any;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
