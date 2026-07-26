import { Controller, Get, Inject, Param } from "@nestjs/common"

import { LeaderboardService } from "./leaderboard.service"

@Controller("rooms/:code/leaderboard")
export class LeaderboardController {
  constructor(@Inject(LeaderboardService) private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getStandings(@Param("code") code: string) {
    return this.leaderboardService.getStandings(code)
  }
}
