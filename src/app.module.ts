import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TaeApiClient } from './api/tae-api.client';
import { AuthTokenService } from './auth/auth-token.service';
import { BotRunnerService } from './bots/bot-runner.service';
import { BotsController } from './bots/bots.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { SaldoAsignacionService } from './saldos/saldo-asignacion.service';
import { SaldosController } from './saldos/saldos.controller';
import { SwitcherService } from './switcher/switcher.service';
import { SwitcherController } from './switcher/switcher.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout: 90000,
      maxRedirects: 3,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
  ],
  controllers: [
    BotsController,
    DashboardController,
    SaldosController,
    SwitcherController,
  ],
  providers: [
    TaeApiClient,
    AuthTokenService,
    BotRunnerService,
    SaldoAsignacionService,
    SwitcherService,
  ],
})
export class AppModule {}
