import { Module } from "@nestjs/common"

import { CategoriesModule } from "../categories/categories.module"
import { RoomsController } from "./rooms.controller"
import { RoomsService } from "./rooms.service"

@Module({
  imports: [CategoriesModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
