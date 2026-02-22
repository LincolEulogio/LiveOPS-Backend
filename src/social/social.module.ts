import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';

@Module({
    imports: [],
    providers: [SocialService],
    controllers: [SocialController],
    exports: [SocialService],
})
export class SocialModule { }
