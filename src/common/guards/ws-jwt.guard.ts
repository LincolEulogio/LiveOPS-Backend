import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    // Extract token from handshake auth or query
    const authToken: unknown = client.handshake?.auth?.token;
    const queryToken = client.handshake?.query?.token;
    const token: string | undefined =
      typeof authToken === 'string'
        ? authToken
        : Array.isArray(queryToken)
          ? queryToken[0]
          : queryToken;

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload: { sub: string } = await this.jwtService.verifyAsync<{
        sub: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'super-secret',
      });
      // Attach user to socket client object
      (client.data as { user: { userId: string } }).user = {
        userId: payload.sub,
      };
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
