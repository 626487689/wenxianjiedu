import { useState, useEffect } from 'react'
import { PanelCard } from './PanelCard'

type ZoteroPanelProps = {
  onSelectZoteroItem: (items: any[]) => void
}

export function ZoteroPanel(props: ZoteroPanelProps) {
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    loadCollections()
  }, [])

  async function loadCollections() {
    try {
      setLoading(true)
      setError(undefined)
      // 这里应该调用 appFacade.getZoteroCollections()
      // 暂时使用模拟数据
      const mockCollections = [
        { id: '1', name: 'Machine Learning' },
        { id: '2', name: 'Natural Language Processing' },
        { id: '3', name: 'Computer Vision' }
      ]
      setCollections(mockCollections)
    } catch (err) {
      setError('加载Zotero集合失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadItemsByCollection(collectionId: string) {
    try {
      setLoading(true)
      setError(undefined)
      // 这里应该调用 appFacade.getZoteroItemsByCollection(collectionId)
      // 暂时使用模拟数据
      const mockItems = [
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
      setItems(mockItems)
    } catch (err) {
      setError('加载Zotero项目失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleCollectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const collectionId = e.target.value
    setSelectedCollectionId(collectionId)
    if (collectionId) {
      loadItemsByCollection(collectionId)
    } else {
      setItems([])
    }
  }

  function handleSelectItems() {
    if (items.length > 0) {
      props.onSelectZoteroItem(items)
    }
  }

  return (
    <PanelCard title="Zotero集成">
      <div style={styles.container}>
        <div style={styles.section}>
          <div style={styles.label}>选择集合</div>
          <select
            style={styles.select}
            value={selectedCollectionId}
            onChange={handleCollectionChange}
            disabled={loading || collections.length === 0}
          >
            <option value="">请选择集合</option>
            {collections.map(collection => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {items.length > 0 && (
          <div style={styles.itemsContainer}>
            <div style={styles.label}>论文列表</div>
            <div style={styles.itemsList}>
              {items.map(item => (
                <div key={item.id} style={styles.item}>
                  <div style={styles.itemTitle}>{item.title}</div>
                  <div style={styles.itemAuthors}>{item.authors?.join(', ')}</div>
                  <div style={styles.itemMeta}>{item.publicationTitle} ({item.date})</div>
                </div>
              ))}
            </div>
            <button 
              style={styles.selectButton}
              onClick={handleSelectItems}
            >
              选择这些论文
            </button>
          </div>
        )}

        {loading && <div style={styles.loading}>加载中...</div>}
      </div>
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
  },
  error: {
    fontSize: '12px',
    color: '#ef4444',
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  loading: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '8px',
  },
  itemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  item: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '4px',
  },
  itemAuthors: {
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '2px',
  },
  itemMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  selectButton: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
  },
}
