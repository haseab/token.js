import axios from 'axios'
import chalk from 'chalk'
import { lookup } from 'mime-types'

import { LLMChatModel, LLMProvider } from '../chat'
import { models } from '../models'
import { ConfigOptions } from '../userTypes'
import { AI21Handler } from './ai21'
import { AnthropicHandler } from './anthropic'
import { BaseHandler } from './base'
import { BedrockHandler } from './bedrock'
import { CohereHandler } from './cohere'
import { GeminiHandler } from './gemini'
import { GroqHandler } from './groq'
import { MistralHandler } from './mistral'
import { OpenAIHandler } from './openai'
import { PerplexityHandler } from './perplexity'
import { InputError, MIMEType } from './types'

export const Handlers: Record<string, (opts: ConfigOptions) => any> = {
  ['openai']: (opts: ConfigOptions) =>
    new OpenAIHandler(
      opts,
      models.openai.models,
      models.openai.supportsJSON,
      models.openai.supportsImages
    ),
  ['anthropic']: (opts: ConfigOptions) =>
    new AnthropicHandler(
      opts,
      models.anthropic.models,
      models.anthropic.supportsJSON,
      models.anthropic.supportsImages
    ),
  ['gemini']: (opts: ConfigOptions) =>
    new GeminiHandler(
      opts,
      models.gemini.models,
      models.gemini.supportsJSON,
      models.gemini.supportsImages
    ),
  ['cohere']: (opts: ConfigOptions) =>
    new CohereHandler(
      opts,
      models.cohere.models,
      models.cohere.supportsJSON,
      models.cohere.supportsImages
    ),
  ['bedrock']: (opts: ConfigOptions) =>
    new BedrockHandler(
      opts,
      models.bedrock.models,
      models.bedrock.supportsJSON,
      models.bedrock.supportsImages
    ),
  ['mistral']: (opts: ConfigOptions) =>
    new MistralHandler(
      opts,
      models.mistral.models,
      models.mistral.supportsJSON,
      models.mistral.supportsImages
    ),
  ['groq']: (opts: ConfigOptions) =>
    new GroqHandler(
      opts,
      models.groq.models,
      models.groq.supportsJSON,
      models.groq.supportsImages
    ),
  ['ai21']: (opts: ConfigOptions) =>
    new AI21Handler(
      opts,
      models.ai21.models,
      models.ai21.supportsJSON,
      models.ai21.supportsImages
    ),
  ['perplexity']: (opts: ConfigOptions) =>
    new PerplexityHandler(
      opts,
      models.perplexity.models,
      models.perplexity.supportsJSON,
      models.perplexity.supportsImages
    ),
}

export const getHandler = (
  provider: LLMProvider,
  opts: ConfigOptions
): BaseHandler<any> => {
  for (const handlerKey in Handlers) {
    if (provider === handlerKey) {
      return Handlers[handlerKey](opts)
    }
  }

  throw new Error(
    `Could not find provider for model. Are you sure the model name is correct and the provider is supported?`
  )
}

export const getTimestamp = () => {
  return Math.floor(new Date().getTime() / 1000)
}

export const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data, 'binary')
  return buffer.toString('base64')
}

export const getMimeType = (url: string): string => {
  const parsedUrl = new URL(url)
  const pathname = parsedUrl.pathname
  const extension = pathname.split('.').pop()
  return lookup(extension)
}

const isUrl = (input: string): boolean => {
  try {
    const url = new URL(input)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

const isBase64Image = (input: string): boolean =>
  /^data:image\/[a-zA-Z]+;base64,/.test(input)

export const fetchThenParseImage = async (
  urlOrBase64Image: string
): Promise<{ content: string; mimeType: MIMEType }> => {
  if (isUrl(urlOrBase64Image)) {
    const content = await fetchImageAsBase64(urlOrBase64Image)
    const mimeType = getMimeType(urlOrBase64Image)
    if (mimeType === null) {
      throw new Error(
        `Failed to get the mime type for the URL: ${urlOrBase64Image}`
      )
    }
    if (!isSupportedMIMEType(mimeType)) {
      throw new InputError(`Unsupported MIME type: ${mimeType}`)
    }

    return {
      content,
      mimeType,
    }
  } else if (isBase64Image(urlOrBase64Image)) {
    return parseImage(urlOrBase64Image)
  } else {
    throw new InputError('Invalid image URL.')
  }
}

export const isSupportedMIMEType = (value: string): value is MIMEType => {
  return (
    value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/gif' ||
    value === 'image/webp'
  )
}

export const parseImage = (
  image: string
): { content: string; mimeType: MIMEType } => {
  const parts = image.split(';base64,')
  if (parts.length === 2) {
    const mimeType = parts[0].replace('data:', '').toLowerCase()
    if (!isSupportedMIMEType(mimeType)) {
      throw new InputError(`Unsupported MIME type: ${mimeType}`)
    }
    return {
      content: parts[1],
      mimeType,
    }
  } else {
    throw new InputError('Invalid image URL.')
  }
}

export const consoleWarn = (message: string): void => {
  console.warn(chalk.yellow.bold(`Warning: ${message}\n`))
}

export const assertNIsOne = (
  n: number | null | undefined,
  provider: string
): void => {
  if (typeof n === 'number' && n > 1) {
    throw new InputError(
      `${provider} does not support setting 'n' greater than 1.`
    )
  }
}

export const normalizeTemperature = (
  temperature: number,
  provider: LLMProvider,
  model: LLMChatModel
): number => {
  const normalizeProviders = ['mistral', 'anthropic', 'cohere', 'bedrock']

  if (normalizeProviders.includes(provider)) {
    return temperature / 2
  } else if (provider === 'bedrock') {
    if (
      model.startsWith('amazon') ||
      model.startsWith('anthropic') ||
      model.startsWith('cohere') ||
      model.startsWith('mistral') ||
      model.startsWith('meta')
    ) {
      return temperature / 2
    }
  }

  return temperature
}

export const isEmptyObject = (variable: any): boolean => {
  return (
    variable &&
    typeof variable === 'object' &&
    variable.constructor === Object &&
    Object.keys(variable).length === 0
  )
}

export const isObject = (variable: any): boolean => {
  return (
    variable && typeof variable === 'object' && variable.constructor === Object
  )
}
