
import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus, User, UserRole, Review, Coordinates } from '../types';

// --- GEOCODING SERVICE ---

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const HEADERS = {
    'User-Agent': 'KvantApp/1.0',
    'Accept-Language': 'ru'
};

// 1. Direct Geocoding (Address -> Coords)
export const resolveCoordinates = async (address: string): Promise<Coordinates | undefined> => {
    try {
        const query = encodeURIComponent(address);
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=json&q=${query}&limit=1`, { headers: HEADERS });
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
    } catch (e) {
        console.warn("Geocoding failed for:", address, e);
    }
    return undefined;
};

// 2. Reverse Geocoding (Coords -> Address)
export const getAddressFromCoords = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: HEADERS });
        const data = await response.json();
        
        if (data && data.address) {
            // Construct a clean address string
            const road = data.address.road || data.address.pedestrian || data.address.street;
            const house = data.address.house_number;
            const city = data.address.city || data.address.town || data.address.village;
            
            let result = '';
            if (road) result += road;
            if (house) result += `, ${house}`;
            if (!road && !house && data.display_name) {
                // Fallback to display name parts if road is missing (e.g. parks)
                return data.display_name.split(',').slice(0, 2).join(',');
            }
            // if (city) result += ` (${city})`; // Optional: Include city
            return result || data.display_name;
        }
        return undefined;
    } catch (e) {
        console.warn("Reverse geocoding failed", e);
        return undefined;
    }
};

// 3. Autocomplete Search
export const searchLocations = async (query: string): Promise<Array<{ label: string, lat: number, lng: number }>> => {
    try {
        if (query.length < 3) return [];
        const encodedQuery = encodeURIComponent(query);
        // Limit to 5 results, specifically looking for addresses
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1&countrycodes=ru`, { headers: HEADERS });
        const data = await response.json();
        
        return data.map((item: any) => {
            const addr = item.address || {};
            let label = item.display_name;
            
            // Try to make a shorter label
            const street = addr.road || addr.pedestrian || addr.street;
            const house = addr.house_number;
            const city = addr.city || addr.town || addr.village;
            
            if (street) {
                label = street;
                if (house) label += `, ${house}`;
                if (city) label += ` • ${city}`;
            }

            return {
                label: label,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            };
        });
    } catch (e) {
        console.warn("Autocomplete failed", e);
        return [];
    }
};

// --- AUTH & USER API ---

export const registerUser = async (email: string, password: string, role: UserRole, name: string, phone: string) => {
    const cleanEmail = email.toLowerCase().trim(); 
    const cleanPhone = phone.trim();

    try {
        const { count, error: checkError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('phone', cleanPhone);

        if (!checkError && count !== null && count > 0) {
            throw new Error("Этот номер телефона уже используется в другом аккаунте.");
        }
    } catch (e: any) {
        if (e.message === "Этот номер телефона уже используется в другом аккаунте.") {
            throw e;
        }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
            data: {
                name: name.trim(),
                role: role,
                phone: cleanPhone,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`
            }
        }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            throw new Error("Пользователь с таким Email уже существует.");
        }
        throw authError;
    }

    if (authData.user && !authData.session) {
        return { shouldVerify: true, email: cleanEmail };
    }

    if (authData.user && authData.session) {
        try {
            const profile = await ensureUserProfile({
                id: authData.user.id,
                role: role,
                name: name,
                phone: cleanPhone,
                email: cleanEmail,
                avatar: authData.user.user_metadata?.avatar_url
            });
            return { shouldVerify: false, user: profile };
        } catch (profileError: any) {
            if (profileError.message?.includes('duplicate key') || profileError.code === '23505') {
                 const profile = await getUserProfile(authData.user.id);
                 if (profile) return { shouldVerify: false, user: profile };
            }
            throw profileError;
        }
    }

    throw new Error("Неизвестная ошибка регистрации");
};

export const resendCode = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail
    });
    
    if (error) throw error;
};

export const verifySignup = async (email: string, code: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.replace(/\s/g, '').trim(); 

    let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'signup'
    });

    if (error) {
        const retry1 = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanCode,
            type: 'email'
        });
        
        if (!retry1.error && retry1.data.user) {
            data = retry1.data;
            error = null;
        }
    }

    if (error || !data.user) {
        throw new Error("Неверный код или срок действия истек");
    }

    const user = data.user;
    const meta = user.user_metadata;
    
    return ensureUserProfile({
        id: user.id,
        role: meta?.role || UserRole.SENDER,
        name: meta?.name,
        phone: meta?.phone,
        email: user.email,
        avatar: meta?.avatar_url
    });
};

export const loginUser = async (email: string, password: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Пользователь не найден");

    const profile = await getUserProfile(authData.user.id);
    
    if (!profile) {
        const role = authData.user.user_metadata?.role || UserRole.SENDER;
        const name = authData.user.user_metadata?.name || 'Пользователь';
        const phone = authData.user.user_metadata?.phone;
        
        return ensureUserProfile({
            id: authData.user.id,
            role: role,
            name: name,
            phone: phone,
            email: authData.user.email,
            avatar: authData.user.user_metadata?.avatar_url
        });
    }

    return profile;
};

export const updateUserRole = async (userId: string, role: UserRole) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return mapProfileFromDB(data);
};

export const updateUserStatus = async (userId: string, status: 'active' | 'busy') => {
    const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);
    
    if (error) console.error("Failed to update status", error);
};

export const updateUserLocation = async (userId: string, lat: number, lng: number) => {
    const { error } = await supabase
        .from('profiles')
        .update({ 
            location: { lat, lng, lastUpdated: Date.now() } 
        })
        .eq('id', userId);

    if (error) console.error("Failed to update location", error);
};

export const updatePushToken = async (userId: string, token: string) => {
    const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
    
    if (error) console.error("Failed to update push token", error);
};

export const uploadAvatar = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
            upsert: true
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

    if (updateError) throw updateError;

    return publicUrl;
};

export const ensureUserProfile = async (user: Partial<User>) => {
    const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (existing) {
        return {
            ...mapProfileFromDB(existing),
            email: user.email || undefined
        };
    }

    const newUser = {
        id: user.id,
        name: user.name || 'Пользователь',
        role: user.role || UserRole.SENDER, 
        phone: user.phone || null,
        avatar_url: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        rating: 5.0,
        wallet_balance: 0,
        commission_debt: 0,
        status: 'active'
    };

    const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert([newUser])
        .select()
        .single();
    
    if (insertError) throw insertError;

    return {
        ...mapProfileFromDB(created),
        email: user.email
    };
};

export const getUserProfile = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (profileError || !profile) return null;

    const { data: { user } } = await supabase.auth.getUser();
    let email = undefined;
    if (user && user.id === userId) {
        email = user.email;
    }

    const mapped = mapProfileFromDB(profile);
    return { ...mapped, email };
};

export const initiateContactChange = async (type: 'email' | 'phone', value: string) => {
    const cleanValue = value.trim();
    const updates: any = {};
    if (type === 'email') updates.email = cleanValue;
    if (type === 'phone') updates.phone = cleanValue;
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
};

export const verifyContactChange = async (type: 'email' | 'phone', value: string, token: string) => {
    const cleanToken = token.trim();
    const cleanValue = value.trim();
    
    const { error } = await supabase.auth.verifyOtp(
        type === 'email' 
            ? { type: 'email_change', email: cleanValue, token: cleanToken }
            : { type: 'phone_change', phone: cleanValue, token: cleanToken }
    );

    if (error) throw error;
    if (type === 'phone') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ phone: cleanValue }).eq('id', user.id);
        }
    }
};

export const subscribeToProfile = (userId: string, onUpdate: (user: User) => void) => {
    const subscription = supabase
        .channel(`public:profiles:id=eq.${userId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${userId}` 
        }, async (payload) => {
            const fullProfile = await getUserProfile(userId);
            if (fullProfile) onUpdate(fullProfile);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

// --- ORDERS API ---

export const fetchAllOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
    return data.map(mapOrderFromDB);
};

export const createOrder = async (orderData: Partial<Order>) => {
    if (!orderData.senderId) throw new Error("Sender ID missing");
    
    const priceValue = typeof orderData.price === 'string' ? parseFloat(orderData.price) : orderData.price;

    const dbPayload = {
        sender_id: orderData.senderId,
        title: orderData.title || "Без названия",
        description: orderData.description || "",
        pickup_address: orderData.pickupAddress || "",
        delivery_address: orderData.deliveryAddress || "",
        pickup_location: orderData.pickupLocation || null, 
        delivery_location: orderData.deliveryLocation || null,
        price: isNaN(priceValue) ? 0 : priceValue, 
        weight: orderData.weight || "до 1 кг",
        status: orderData.status || OrderStatus.PENDING,
        payment_method: orderData.paymentMethod || "card",
        options: Array.isArray(orderData.options) ? orderData.options : [],
        counter_offers: [], 
        courier_id: null, 
        is_reviewed: false, 
        created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
        .from('orders')
        .insert([dbPayload])
        .select()
        .single();

    if (error) throw error;
    return mapOrderFromDB(data);
};

export const attemptAcceptOrder = async (orderId: string, courierId: string, price: number) => {
    const { data, error } = await supabase
        .from('orders')
        .update({ 
            status: OrderStatus.ACCEPTED,
            courier_id: courierId,
            price: price 
        })
        .eq('id', orderId)
        .is('courier_id', null) 
        .select()
        .single();

    if (error || !data) {
        throw new Error("Заказ уже принят другим курьером или недоступен.");
    }

    return mapOrderFromDB(data);
};

export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    const dbUpdates: any = {};
    
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.courierId !== undefined) dbUpdates.courier_id = updates.courierId;
    if (updates.price) dbUpdates.price = updates.price;
    if (updates.counterOffers) dbUpdates.counter_offers = updates.counterOffers;
    if (updates.isReviewed !== undefined) dbUpdates.is_reviewed = updates.isReviewed;
    if (updates.cancellationReason) dbUpdates.cancellation_reason = updates.cancellationReason;
    
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description; 
    if (updates.pickupAddress) dbUpdates.pickup_address = updates.pickupAddress;
    if (updates.deliveryAddress) dbUpdates.delivery_address = updates.deliveryAddress;
    if (updates.weight) dbUpdates.weight = updates.weight;
    if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;
    if (updates.options) dbUpdates.options = updates.options;
    
    if (updates.completedAt) {
        dbUpdates.completed_at = new Date(updates.completedAt).toISOString();
    }

    const { data, error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', orderId)
        .select()
        .single();

    if (error) throw error;
    return mapOrderFromDB(data);
};

export const removeCounterOffer = async (orderId: string, courierId: string) => {
    const { data: order } = await supabase
        .from('orders')
        .select('counter_offers')
        .eq('id', orderId)
        .single();

    if (!order) return;

    const currentOffers = order.counter_offers || [];
    const newOffers = currentOffers.filter((o: any) => o.courierId !== courierId);
    const newStatus = newOffers.length === 0 ? OrderStatus.PENDING : OrderStatus.NEGOTIATING;

    await supabase
        .from('orders')
        .update({ counter_offers: newOffers, status: newStatus })
        .eq('id', orderId);
};

export const subscribeToOrders = (onUpdate: (payload: any) => void) => {
    const subscription = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            onUpdate(payload);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

export const fetchUserReviews = async (userId: string): Promise<Review[]> => {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('target_id', userId)
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((r: any) => ({
        id: r.id,
        name: 'Пользователь', 
        rating: r.rating,
        date: new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        text: r.comment,
        avatarColor: 'from-gray-500 to-slate-500'
    }));
};

export const createReview = async (reviewData: any) => {
    const { error } = await supabase
        .from('reviews')
        .insert([{
            order_id: reviewData.orderId,
            author_id: reviewData.authorId,
            target_id: reviewData.targetId,
            rating: reviewData.rating,
            comment: reviewData.comment
        }]);
    
    if (error) throw error;

    const { data: reviews, error: fetchError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_id', reviewData.targetId);

    if (!fetchError && reviews && reviews.length > 0) {
        const totalStars = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = totalStars / reviews.length;

        await supabase
            .from('profiles')
            .update({ rating: averageRating })
            .eq('id', reviewData.targetId);
    }
};

export const subscribeToReviews = (userId: string, onUpdate: () => void) => {
    const subscription = supabase
        .channel(`public:reviews:target_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `target_id=eq.${userId}` }, () => onUpdate())
        .subscribe();
    return () => { supabase.removeChannel(subscription); };
};

// --- MAPPERS ---

export const mapOrderFromDB = (dbRecord: any): Order => ({
    id: dbRecord.id,
    senderId: dbRecord.sender_id || dbRecord.senderId,
    courierId: dbRecord.courier_id || dbRecord.courierId,
    title: dbRecord.title,
    description: dbRecord.description,
    pickupAddress: dbRecord.pickup_address || dbRecord.pickupAddress,
    deliveryAddress: dbRecord.delivery_address || dbRecord.deliveryAddress,
    pickupLocation: dbRecord.pickup_location || null,
    deliveryLocation: dbRecord.delivery_location || null,
    price: Number(dbRecord.price),
    weight: dbRecord.weight,
    status: dbRecord.status as OrderStatus,
    createdAt: new Date(dbRecord.created_at || dbRecord.createdAt).getTime(),
    completedAt: dbRecord.completed_at ? new Date(dbRecord.completed_at).getTime() : undefined,
    paymentMethod: dbRecord.payment_method || 'card',
    options: dbRecord.options || [],
    counterOffers: dbRecord.counter_offers || dbRecord.counterOffers || [],
    isReviewed: dbRecord.is_reviewed || false,
    cancellationReason: dbRecord.cancellation_reason
});

const mapProfileFromDB = (dbRecord: any): User => ({
    id: dbRecord.id,
    name: dbRecord.name,
    role: dbRecord.role as UserRole,
    avatar: dbRecord.avatar_url || dbRecord.avatar,
    rating: Number(dbRecord.rating),
    walletBalance: Number(dbRecord.wallet_balance),
    commissionDebt: Number(dbRecord.commission_debt),
    city: dbRecord.city,
    phone: dbRecord.phone,
    location: dbRecord.location,
    status: dbRecord.status || 'active',
    pushToken: dbRecord.push_token,
    isVerified: dbRecord.is_verified || false
});
