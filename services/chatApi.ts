
import { supabase } from '../lib/supabaseClient';
import { Message } from '../types';

// Map DB record to Message type
const mapMessageFromDB = (record: any): Message => ({
    id: record.id,
    orderId: record.order_id,
    senderId: record.sender_id,
    text: record.text,
    imageUrl: record.image_url,
    isRead: record.is_read,
    // Safely access metadata
    replyTo: record.metadata?.replyTo || null,
    createdAt: new Date(record.created_at).getTime(),
});

export const fetchMessages = async (orderId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
    return data.map(mapMessageFromDB);
};

export const getUnreadCount = async (orderId: string, userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .neq('sender_id', userId) // Messages NOT sent by me
        .eq('is_read', false);    // And NOT read

    if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
    }
    return count || 0;
};

export const sendMessage = async (
    orderId: string, 
    senderId: string, 
    text: string | null, 
    file: File | null = null,
    replyTo: Message['replyTo'] = null
): Promise<Message | null> => {
    let imageUrl: string | null = null;

    if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${orderId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('chat-images')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Image upload failed", uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-images')
            .getPublicUrl(filePath);
            
        imageUrl = publicUrl;
    }

    // Construct the payload.
    // Ensure `metadata` is only sent if `replyTo` exists to avoid potential issues if DB schema is lagging,
    // though the DB update is required for this feature to work.
    const payload: any = {
        order_id: orderId,
        sender_id: senderId,
        text: text,
        image_url: imageUrl,
    };

    if (replyTo) {
        payload.metadata = {
            replyTo: {
                id: replyTo.id,
                senderId: replyTo.senderId,
                text: replyTo.text,
                imageUrl: replyTo.imageUrl
            }
        };
    }

    const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("Message send failed:", error.message, error.details);
        throw error;
    }

    return mapMessageFromDB(data);
};

export const markMessagesAsRead = async (orderId: string, userId: string) => {
    await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .neq('sender_id', userId)
        .eq('is_read', false);
};

export const subscribeToChat = (
    orderId: string, 
    onInsert: (msg: Message) => void,
    onUpdate: (msg: Message) => void
) => {
    const channel = supabase
        .channel(`chat:${orderId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
            (payload) => {
                onInsert(mapMessageFromDB(payload.new));
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
            (payload) => {
                onUpdate(mapMessageFromDB(payload.new));
            }
        )
        .subscribe();

    return {
        unsubscribe: () => supabase.removeChannel(channel),
        channel 
    };
};
