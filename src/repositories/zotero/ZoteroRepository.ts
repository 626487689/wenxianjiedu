import type { ZoteroItem } from '../../services/zotero/ZoteroService'

export interface ZoteroRepository {
  getZoteroItems(): Promise<ZoteroItem[]>
  getCollections(): Promise<{ id: string; name: string }[]>
  getItemsByCollection(collectionId: string): Promise<ZoteroItem[]>
  setZoteroDbPath(path: string): void
  getZoteroDbPath(): string
  isZoteroAvailable(): boolean
}
