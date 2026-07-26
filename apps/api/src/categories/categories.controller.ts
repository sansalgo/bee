import { Controller, Get, Inject } from "@nestjs/common"

import { CategoriesService } from "./categories.service"

@Controller("categories")
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list()
  }
}
