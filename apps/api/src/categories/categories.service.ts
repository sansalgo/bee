import { Injectable, NotFoundException } from "@nestjs/common"
import type { ICategoryPlugin } from "@workspace/shared"

@Injectable()
export class CategoriesService {
  private readonly registry = new Map<string, ICategoryPlugin>()

  register(plugin: ICategoryPlugin): void {
    this.registry.set(plugin.key, plugin)
  }

  get(key: string): ICategoryPlugin {
    const plugin = this.registry.get(key)
    if (!plugin) {
      throw new NotFoundException(`Unknown category: ${key}`)
    }
    return plugin
  }

  list(): { key: string; label: string }[] {
    return [...this.registry.values()].map((plugin) => ({ key: plugin.key, label: plugin.label }))
  }
}
