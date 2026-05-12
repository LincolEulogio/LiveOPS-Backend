import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OverlaysService } from '@/overlays/overlays.service';

export interface LineupPlayer {
  number: string;
  name: string;
  position: string;
}

export interface SportsMatch {
  id: string;
  productionId: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  period: string;
  timer: number; // seconds
  isRunning: boolean;
  lineupA: LineupPlayer[];
  lineupB: LineupPlayer[];
  coachA: string;
  coachB: string;
  referees: string[];
  logoA?: string;
  logoB?: string;
}

@Injectable()
export class SportsService {
  private readonly logger = new Logger(SportsService.name);
  private matches = new Map<string, SportsMatch>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private eventEmitter: EventEmitter2,
    private overlaysService: OverlaysService,
  ) {}

  @OnEvent('overlay.activated')
  @OnEvent('overlay.template_updated')
  handleOverlayUpdate(payload: { productionId: string }) {
    this.logger.log(
      `Automatic sync triggered for production ${payload.productionId}`,
    );
    this.seedFromOverlay(payload.productionId).catch((err) =>
      this.logger.error(
        `Failed to auto-sync: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  getMatch(productionId: string): SportsMatch {
    if (!this.matches.has(productionId)) {
      this.matches.set(productionId, {
        id: `match-${productionId}`,
        productionId,
        teamA: 'Local',
        teamB: 'Visitante',
        scoreA: 0,
        scoreB: 0,
        period: '1T',
        timer: 0,
        isRunning: false,
        lineupA: Array.from({ length: 11 }, () => ({
          number: '',
          name: '',
          position: '',
        })),
        lineupB: Array.from({ length: 11 }, () => ({
          number: '',
          name: '',
          position: '',
        })),
        coachA: '',
        coachB: '',
        referees: ['', '', ''],
      });

      this.seedFromOverlay(productionId).catch((err) =>
        this.logger.error(
          `Failed to auto-seed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    return this.matches.get(productionId)!;
  }

  async seedFromOverlay(productionId: string) {
    const activeOverlay =
      await this.overlaysService.findOneActive(productionId);
    if (!activeOverlay) return;

    interface OverlayLayer {
      name: string;
      content: string;
    }

    interface OverlayConfig {
      layers: OverlayLayer[];
      [key: string]: any;
    }

    const config = (activeOverlay.config as unknown as OverlayConfig) || {
      layers: [],
    };
    const layers = config.layers || [];
    const match = this.getMatch(productionId);

    layers.forEach((layer: OverlayLayer) => {
      const name = layer.name.toLowerCase();
      if (name.includes('equipo a')) match.teamA = layer.content;
      if (name.includes('equipo b')) match.teamB = layer.content;
      if (name.includes('goles a')) match.scoreA = parseInt(layer.content) || 0;
      if (name.includes('goles b')) match.scoreB = parseInt(layer.content) || 0;
      if (name.includes('tiempo')) {
        // Optional: match.timer = parse(layer.content)
      }
    });

    this.broadcastUpdate(productionId);
    return match;
  }

  async updateMatch(productionId: string, data: Partial<SportsMatch>) {
    const match = this.getMatch(productionId);
    Object.assign(match, data);

    this.broadcastUpdate(productionId);

    const bindings: Record<string, string> = {
      equipo_a: match.teamA,
      equipo_b: match.teamB,
      goles_a: String(match.scoreA),
      goles_b: String(match.scoreB),
      periodo: match.period,
      tiempo: this.formatTime(match.timer),
      técnico_a: match.coachA,
      técnico_b: match.coachB,
      árbitros: match.referees.join(' · '),
    };

    // Add players
    match.lineupA.forEach((p, i) => {
      bindings[`jugador_${i + 1}_a`] = `${p.number}. ${p.name}`.trim();
    });
    match.lineupB.forEach((p, i) => {
      bindings[`jugador_${i + 1}_b`] = `${p.number}. ${p.name}`.trim();
    });

    await this.overlaysService.syncLayerContent(productionId, bindings);

    return match;
  }

  toggleTimer(productionId: string) {
    const match = this.getMatch(productionId);

    // Clear existing
    const existing = this.timers.get(productionId);
    if (existing) {
      clearInterval(existing);
      this.timers.delete(productionId);
    }

    match.isRunning = !match.isRunning;

    if (match.isRunning) {
      const interval = setInterval(() => {
        match.timer++;
        // Emit only necessary data for the clock to avoid overhead
        this.eventEmitter.emit('overlay.update_data', {
          productionId,
          tiempo: this.formatTime(match.timer),
          match_timer_raw: match.timer,
          is_running: true,
        });
      }, 1000);
      this.timers.set(productionId, interval);
    }

    this.broadcastUpdate(productionId);
    return match;
  }

  resetTimer(productionId: string) {
    const match = this.getMatch(productionId);
    match.timer = 0;
    this.broadcastUpdate(productionId);
    return match;
  }

  private broadcastUpdate(productionId: string) {
    const match = this.getMatch(productionId);
    const data = {
      productionId,
      score_a: match.scoreA,
      score_b: match.scoreB,
      team_a: match.teamA,
      team_b: match.teamB,
      match_period: match.period,
      match_timer: this.formatTime(match.timer),
      goles_a: match.scoreA,
      goles_b: match.scoreB,
      equipo_a: match.teamA,
      equipo_b: match.teamB,
      tiempo: this.formatTime(match.timer),
      periodo: match.period,
      match_timer_raw: match.timer,
      is_running: match.isRunning,
      lineup_a: match.lineupA,
      lineup_b: match.lineupB,
      coach_a: match.coachA,
      coach_b: match.coachB,
      referees: match.referees,
      logo_a: match.logoA,
      logo_b: match.logoB,
    };

    this.eventEmitter.emit('overlay.update_data', data);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
