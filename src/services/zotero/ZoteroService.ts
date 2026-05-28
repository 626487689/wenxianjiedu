export interface ZoteroItem {
  id: string
  title: string
  authors: string[]
  abstract?: string
  publicationTitle?: string
  date?: string
  doi?: string
  url?: string
  filePath?: string
}

export class ZoteroService {
  private zoteroDbPath: string

  constructor(zoteroDbPath?: string) {
    this.zoteroDbPath = zoteroDbPath || this.getDefaultZoteroDbPath()
  }

  private getDefaultZoteroDbPath(): string {
    // 在浏览器环境中，我们无法直接访问 APPDATA 环境变量
    // 这里返回一个默认路径，实际使用时需要用户手动设置
    return 'Zotero/Zotero/Profiles'
  }

  async getZoteroItems(): Promise<ZoteroItem[]> {
    // 这里应该实现从Zotero数据库读取数据的逻辑
    // 由于需要SQLite驱动，这里先返回模拟数据
    return [
      {
        id: '1',
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
        abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
        publicationTitle: 'Advances in Neural Information Processing Systems',
        date: '2017',
        doi: '10.48550/arXiv.1706.03762',
        url: 'https://arxiv.org/abs/1706.03762'
      },
      {
        id: '2',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
        authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
        abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications.',
        publicationTitle: 'Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies',
        date: '2019',
        doi: '10.18653/v1/N19-1423',
        url: 'https://arxiv.org/abs/1810.04805'
      }
    ]
  }

  async getCollections(): Promise<{ id: string; name: string }[]> {
    // 这里应该实现获取Zotero集合的逻辑
    return [
      { id: '1', name: 'Machine Learning' },
      { id: '2', name: 'Natural Language Processing' },
      { id: '3', name: 'Computer Vision' }
    ]
  }

  async getItemsByCollection(collectionId: string): Promise<ZoteroItem[]> {
    // 这里应该实现根据集合ID获取项目的逻辑
    const allItems = await this.getZoteroItems()
    return allItems
  }

  setZoteroDbPath(path: string): void {
    this.zoteroDbPath = path
  }

  getZoteroDbPath(): string {
    return this.zoteroDbPath
  }

  isZoteroAvailable(): boolean {
    // 在浏览器环境中，我们无法直接检查文件是否存在
    // 这里返回 true，实际使用时需要用户手动设置正确的路径
    return true
  }
}
