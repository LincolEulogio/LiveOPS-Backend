import { Injectable } from '@nestjs/common';

export type LayoutPreset = 'full' | 'pip' | 'split-h' | 'split-v' | 'triple-h' | 'grid-4' | 'custom';

export interface CompositorRegion {
  sourceIndex: number; // index into inputUrls array
  x: number;          // 0..1 normalized
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface CompositorLayout {
  preset: LayoutPreset;
  outputWidth?: number;
  outputHeight?: number;
  regions?: CompositorRegion[]; // required for 'custom'
}

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

@Injectable()
export class FfmpegCompositorService {
  /**
   * Build a complete set of FFmpeg CLI arguments for a composite layout.
   *
   * - Single source / 'full': `-c copy` passthrough, minimal latency.
   * - Multi-source: `-filter_complex` with preset-specific graph, re-encoded
   *   with ultrafast x264 + zerolatency tune for minimum added delay.
   * - Multiple output URLs are handled via the `tee` muxer so the video is
   *   encoded only once even when forwarding to N destinations.
   */
  buildArgs(
    layout: CompositorLayout,
    inputUrls: string[],
    outputUrls: string[],
  ): string[] {
    const W = layout.outputWidth ?? DEFAULT_W;
    const H = layout.outputHeight ?? DEFAULT_H;
    const inputs = inputUrls.length;

    // ── Input flags ──────────────────────────────────────────────────────────
    const inputArgs: string[] = [];
    for (const url of inputUrls) {
      inputArgs.push('-re', '-i', url);
    }

    // ── Build filter graph ───────────────────────────────────────────────────
    const { filterComplex, audioMap } = this.buildFilter(layout, inputs, W, H);

    const teeUrl = outputUrls.map((u) => `[f=flv]${u}`).join('|');

    // ── Single passthrough ───────────────────────────────────────────────────
    if (!filterComplex) {
      return [
        ...inputArgs,
        '-c', 'copy',
        '-f', 'tee', teeUrl,
      ];
    }

    // ── Composite with re-encode ─────────────────────────────────────────────
    return [
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      ...audioMap,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-g', '30',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'tee', teeUrl,
    ];
  }

  // ── Private filter builders ────────────────────────────────────────────────

  private buildFilter(
    layout: CompositorLayout,
    inputs: number,
    W: number,
    H: number,
  ): { filterComplex: string | null; audioMap: string[] } {
    const audioMap = ['-map', '0:a?'];

    switch (layout.preset) {
      case 'full':
        return { filterComplex: null, audioMap: [] };

      case 'pip': {
        const px = Math.round(W * 0.72);
        const py = Math.round(H * 0.66);
        const pw = Math.round(W * 0.27);
        const ph = Math.round(H * 0.27);
        return {
          filterComplex:
            `[0:v]scale=${W}:${H}[bg];` +
            `[1:v]scale=${pw}:${ph}[fg];` +
            `[bg][fg]overlay=${px}:${py}[out]`,
          audioMap,
        };
      }

      case 'split-h': {
        const hw = Math.floor(W / 2);
        return {
          filterComplex:
            `[0:v]scale=${hw}:${H}[L];` +
            `[1:v]scale=${hw}:${H}[R];` +
            `[L][R]hstack[out]`,
          audioMap,
        };
      }

      case 'split-v': {
        const hh = Math.floor(H / 2);
        return {
          filterComplex:
            `[0:v]scale=${W}:${hh}[T];` +
            `[1:v]scale=${W}:${hh}[B];` +
            `[T][B]vstack[out]`,
          audioMap,
        };
      }

      case 'triple-h': {
        const tw = Math.floor(W / 3);
        return {
          filterComplex:
            `[0:v]scale=${tw}:${H}[A];` +
            `[1:v]scale=${tw}:${H}[B];` +
            `[2:v]scale=${tw}:${H}[C];` +
            `[A][B][C]hstack=inputs=3[out]`,
          audioMap,
        };
      }

      case 'grid-4': {
        const gw = Math.floor(W / 2);
        const gh = Math.floor(H / 2);
        return {
          filterComplex:
            `[0:v]scale=${gw}:${gh}[A];` +
            `[1:v]scale=${gw}:${gh}[B];` +
            `[2:v]scale=${gw}:${gh}[C];` +
            `[3:v]scale=${gw}:${gh}[D];` +
            `[A][B]hstack[top];` +
            `[C][D]hstack[bot];` +
            `[top][bot]vstack[out]`,
          audioMap,
        };
      }

      case 'custom': {
        if (!layout.regions || layout.regions.length === 0) {
          return { filterComplex: null, audioMap: [] };
        }
        return {
          filterComplex: this.buildCustomFilter(layout.regions, W, H),
          audioMap,
        };
      }

      default:
        return { filterComplex: null, audioMap: [] };
    }
  }

  /**
   * Build an overlay chain for arbitrary region positions.
   * Regions are sorted by zIndex (lowest rendered first).
   */
  private buildCustomFilter(
    regions: CompositorRegion[],
    W: number,
    H: number,
  ): string {
    const sorted = [...regions].sort((a, b) => a.zIndex - b.zIndex);
    const parts: string[] = [];

    // Scale each source to its region dimensions
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const rw = Math.round(r.width * W);
      const rh = Math.round(r.height * H);
      parts.push(`[${r.sourceIndex}:v]scale=${rw}:${rh}[s${i}]`);
    }

    // Build overlay chain
    // Base: first region on a black canvas
    const first = sorted[0];
    const fx = Math.round(first.x * W);
    const fy = Math.round(first.y * H);
    parts.push(`color=black:size=${W}x${H}:rate=30[canvas]`);
    parts.push(`[canvas][s0]overlay=${fx}:${fy}[layer0]`);

    for (let i = 1; i < sorted.length; i++) {
      const r = sorted[i];
      const ox = Math.round(r.x * W);
      const oy = Math.round(r.y * H);
      const prev = `layer${i - 1}`;
      const next = i === sorted.length - 1 ? 'out' : `layer${i}`;
      parts.push(`[${prev}][s${i}]overlay=${ox}:${oy}[${next}]`);
    }

    return parts.join(';');
  }
}
