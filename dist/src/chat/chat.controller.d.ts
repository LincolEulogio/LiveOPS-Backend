import { ChatService } from '@/chat/chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getHistory(productionId: string, limit?: number): Promise<({
        user: {
            id: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        productionId: string;
        userId: string | null;
        message: string;
    })[]>;
}
