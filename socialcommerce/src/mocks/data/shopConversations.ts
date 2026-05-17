import { USERS } from './users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

function makeConv(
    id: string, shopId: string, custId: string, subject: string,
    status: string, assigneeId: string | null, linkedOrderId: string | null, linkedOrderNum: string | null,
    tags: string[], unread: number, daysAgoCreated: number,
    messages: Array<{ senderId: string; content: string; isInternal?: boolean; daysAgo: number }>
) {
    const cu = u(custId);
    const lastMsg = messages[messages.length - 1];
    return {
        id, shop_id: shopId,
        customer_id: custId,
        customer_name: cu.display_name,
        customer_avatar_url: cu.avatar_url,
        customer_email: `${cu.username}@example.com`,
        subject, status,
        assignee_id: assigneeId,
        assignee_name: assigneeId ? u(assigneeId).display_name : null,
        linked_order_id: linkedOrderId,
        linked_order_number: linkedOrderNum,
        tags, unread_by_staff: unread,
        last_message: lastMsg ? {
            content: lastMsg.content,
            sender_is_customer: lastMsg.senderId === custId,
            at: daysAgo(lastMsg.daysAgo),
        } : null,
        created_at: daysAgo(daysAgoCreated),
        updated_at: daysAgo(lastMsg?.daysAgo ?? daysAgoCreated),
        messages: messages.map((m, idx) => ({
            id: `${id}-msg-${idx + 1}`,
            conversation_id: id,
            sender_id: m.senderId,
            sender_name: u(m.senderId).display_name,
            sender_avatar_url: u(m.senderId).avatar_url,
            sender_is_customer: m.senderId === custId,
            content: m.content,
            is_internal_note: m.isInternal ?? false,
            created_at: daysAgo(m.daysAgo),
        })),
    };
}

export const SHOP_CONVERSATIONS = [
    makeConv('sconv-1', 'shop-1', 'usr-2', 'Issue with order ORD-1001', 'OPEN', 'usr-1', 'sord-1', 'ORD-1001',
        ['return', 'delivered'], 1, 5, [
            { senderId: 'usr-2', content: 'Hi! I received my headphones but the right ear cup feels loose. Can I get a replacement?', daysAgo: 5 },
            { senderId: 'usr-1', content: 'Hi Sarah! Sorry to hear that. Could you send a photo of the issue? We\'ll sort it out right away.', daysAgo: 4.9 },
            { senderId: 'usr-2', content: 'Sure, here\'s the photo. You can see the joint is cracked.', daysAgo: 4.8 },
            { senderId: 'usr-1', content: 'Thank you for the photo. We\'ve approved a replacement — it should ship within 1 business day.', daysAgo: 4.5 },
            { senderId: 'usr-2', content: 'That\'s great, thank you! Do I need to return the damaged one?', daysAgo: 0.2 },
        ]),
    makeConv('sconv-2', 'shop-1', 'usr-3', 'Delivery estimate for ORD-1002', 'OPEN', null, 'sord-2', 'ORD-1002',
        ['shipping'], 2, 3, [
            { senderId: 'usr-3', content: 'Hey, my order shows as shipped 3 days ago but no tracking updates. When should I expect it?', daysAgo: 3 },
            { senderId: 'usr-3', content: 'I need it by Friday for a gift.', daysAgo: 2.9 },
        ]),
    makeConv('sconv-3', 'shop-1', 'usr-4', 'Pre-sales question: SSD compatibility', 'CLOSED', 'usr-2', null, null,
        ['pre-sales', 'technical'], 0, 10, [
            { senderId: 'usr-4', content: 'Is the Portable SSD compatible with the M1 MacBook Air?', daysAgo: 10 },
            { senderId: 'usr-2', content: 'Yes, absolutely! It uses USB-C which is fully compatible with M1 Macs. Transfer speeds are excellent too.', daysAgo: 9.9 },
            { senderId: 'usr-4', content: 'Perfect, just ordered it. Thanks!', daysAgo: 9.8 },
        ]),
    makeConv('sconv-4', 'shop-1', 'usr-5', 'Refund request ORD-1005', 'PENDING', 'usr-1', 'sord-5', 'ORD-1005',
        ['refund'], 0, 6, [
            { senderId: 'usr-5', content: 'I\'d like to request a refund for the earbuds. They don\'t fit my ears.', daysAgo: 6 },
            { senderId: 'usr-1', content: 'We\'ve initiated the refund. Please expect it within 5-7 business days.', daysAgo: 5.5 },
            { senderId: 'usr-1', content: 'Internal note: Refund processed via Stripe #rf_123', isInternal: true, daysAgo: 5.4 },
        ]),
    makeConv('sconv-5', 'shop-1', 'usr-6', 'Bulk order inquiry', 'OPEN', null, null, null,
        ['wholesale', 'pre-sales'], 3, 1, [
            { senderId: 'usr-6', content: 'Hi, we\'re a school and would like to purchase 50 units of the UltraSound headphones. Do you offer bulk pricing?', daysAgo: 1 },
        ]),
    makeConv('sconv-6', 'shop-1', 'usr-2', 'Webcam setup help', 'CLOSED', 'usr-3', null, null,
        ['support', 'technical'], 0, 15, [
            { senderId: 'usr-2', content: 'I can\'t get the webcam to work on my PC. The driver says it\'s unsupported.', daysAgo: 15 },
            { senderId: 'usr-3', content: 'Hi! Try downloading the latest driver from our support page. Here\'s the link: support.example.com/webcam', daysAgo: 14.9 },
            { senderId: 'usr-2', content: 'That worked! Thank you so much.', daysAgo: 14 },
        ]),
    makeConv('sconv-7', 'shop-1', 'usr-4', 'Custom color request for lamp', 'OPEN', null, null, null,
        ['customization'], 1, 0.5, [
            { senderId: 'usr-4', content: 'Do you have the desk lamp in any other colors? Looking for something in dark green.', daysAgo: 0.5 },
        ]),
    makeConv('sconv-8', 'shop-1', 'usr-5', 'Wrong item received', 'OPEN', 'usr-2', 'sord-9', 'ORD-1009',
        ['wrong-item', 'urgent'], 2, 2, [
            { senderId: 'usr-5', content: 'I ordered the Cream Polaroid but received the Blue one. I need the Cream for a photo shoot this weekend.', daysAgo: 2 },
            { senderId: 'usr-2', content: 'I\'m so sorry for the mix-up! I\'m checking inventory now.', daysAgo: 1.9 },
            { senderId: 'usr-2', content: 'Internal: Cream is out of stock. Offer refund or let customer keep the Blue at 50% discount.', isInternal: true, daysAgo: 1.8 },
            { senderId: 'usr-5', content: 'Is there any update? I need this resolved today.', daysAgo: 0.1 },
        ]),
];

export const SHOP_CANNED_REPLIES = [
    { id: 'cr-1', shop_id: 'shop-1', title: 'Order confirmation', body: 'Thank you for your order! We\'ll process it within 1 business day and send you tracking info.' },
    { id: 'cr-2', shop_id: 'shop-1', title: 'Return instructions', body: 'To initiate a return, please ship the item back to our warehouse at: 123 Return St, Austin TX 78701. Include your order number in the package.' },
    { id: 'cr-3', shop_id: 'shop-1', title: 'Refund timeline', body: 'Your refund has been processed and should appear on your original payment method within 5-7 business days.' },
    { id: 'cr-4', shop_id: 'shop-1', title: 'Shipping update', body: 'Your order has been shipped! You can track it using the tracking number provided in your shipment notification email.' },
];
