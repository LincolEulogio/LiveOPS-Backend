import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getHistory(productionId: string, limit?: number): Promise<({
        user: {
            name: string | null;
            id: string;
        } | null;
    } & {
        productionId: string;
        message: string;
        id: string;
        createdAt: Date;
        userId: string | null;
    })[]>;
}
