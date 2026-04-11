import type { ComposePromptInput, ComposedPrompt } from '../../types/prompt'

export interface PromptComposer {
  compose(input: ComposePromptInput): ComposedPrompt
}
