import { GoogleGenerativeAI } from '@google/generative-ai'

export type AIEngine = 'gemini' | 'claude' | 'openai'

interface GenerateOptions {
  prompt: string
  article: string
  engine: AIEngine
}

export async function generateContent({ prompt, article, engine }: GenerateOptions): Promise<string> {
  switch (engine) {
    case 'gemini':
      return generateWithGemini(prompt, article)
    case 'claude':
      return generateWithClaude(prompt, article)
    case 'openai':
      return generateWithOpenAI(prompt, article)
    default:
      throw new Error(`Unsupported AI engine: ${engine}`)
  }
}

async function generateWithGemini(prompt: string, article: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const fullPrompt = `${prompt}

文章內容：
${article}`

  const result = await model.generateContent(fullPrompt)
  const response = await result.response
  const text = response.text()

  return text
}

async function generateWithClaude(prompt: string, article: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not configured')
  }

  // TODO: 實作 Claude API 調用
  throw new Error('Claude API not implemented yet')
}

async function generateWithOpenAI(prompt: string, article: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  // TODO: 實作 OpenAI API 調用
  throw new Error('OpenAI API not implemented yet')
}
