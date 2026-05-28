import { ZoteroService } from '../../services/zotero/ZoteroService'
import type { ZoteroRepository } from './ZoteroRepository'
import type { ZoteroItem } from '../../services/zotero/ZoteroService'

export class LocalZoteroRepository implements ZoteroRepository {
  private zoteroService: ZoteroService

  constructor() {
    this.zoteroService = new ZoteroService()
  }

  async getZoteroItems(): Promise<ZoteroItem[]> {
    return this.zoteroService.getZoteroItems()
  }

  async getCollections(): Promise<{ id: string; name: string }[]> {
    return this.zoteroService.getCollections()
  }

  async getItemsByCollection(collectionId: string): Promise<ZoteroItem[]> {
    return this.zoteroService.getItemsByCollection(collectionId)
  }

  setZoteroDbPath(path: string): void {
    this.zoteroService.setZoteroDbPath(path)
  }

  getZoteroDbPath(): string {
    return this.zoteroService.getZoteroDbPath()
  }

  isZoteroAvailable(): boolean {
    return this.zoteroService.isZoteroAvailable()
  }
}
