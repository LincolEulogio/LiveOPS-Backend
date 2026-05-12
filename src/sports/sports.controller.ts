import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SportsService, SportsMatch } from './sports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('productions/:productionId/sports')
@UseGuards(JwtAuthGuard)
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  getMatch(@Param('productionId') productionId: string) {
    return this.sportsService.getMatch(productionId);
  }

  @Post('update')
  updateMatch(
    @Param('productionId') productionId: string,
    @Body() data: Partial<SportsMatch>,
  ) {
    return this.sportsService.updateMatch(productionId, data);
  }

  @Post('timer/toggle')
  toggleTimer(@Param('productionId') productionId: string) {
    return this.sportsService.toggleTimer(productionId);
  }

  @Post('timer/reset')
  resetTimer(@Param('productionId') productionId: string) {
    return this.sportsService.resetTimer(productionId);
  }

  @Post('seed')
  seedFromOverlay(@Param('productionId') productionId: string) {
    return this.sportsService.seedFromOverlay(productionId);
  }
}
