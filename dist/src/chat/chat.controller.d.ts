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
        productionId: string;
        createdAt: Date;
        message: string;
        userId: string | null;
    })[]>;
}
