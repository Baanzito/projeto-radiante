import { Module } from '@nestjs/common';
import { MatchesController, ReflectionsController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  controllers: [MatchesController, ReflectionsController],
  providers: [MatchesService],
})
export class MatchesModule {}
