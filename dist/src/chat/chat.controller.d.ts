import { ChatService } from './chat.service';
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
        userId: string | null;
        createdAt: Date;
        productionId: string;
        message: string;
    })[]>;
}
