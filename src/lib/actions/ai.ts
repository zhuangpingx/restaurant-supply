'use server'

interface RecognizedItem {
  name: string
  quantity: number
  unit: string
  unit_price: number
}

interface RecognizeResult {
  items?: RecognizedItem[]
  error?: string
}

export async function recognizeDeliveryNote(imageUrl: string): Promise<RecognizeResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: `请识别这张送货单图片中的商品信息，返回 JSON 格式。

要求：
1. 识别所有商品名称、数量、单位、单价
2. 如果看不清单价，unit_price 填 0
3. 单位尽量标准化：kg/g/件/箱/袋/瓶/桶/包/捆/扎/条/块/个/只/斤
4. 只返回 JSON，不要其他文字

返回格式：
{"items": [{"name": "商品名", "quantity": 数量, "unit": "单位", "unit_price": 单价}]}

如果图片不是送货单或无法识别，返回：
{"items": [], "error": "无法识别"}`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      return { error: 'AI 服务暂时不可用，请手动填写' }
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // 解析 JSON
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (parsed.error) return { error: parsed.error }
    if (!parsed.items?.length) return { error: '未识别到商品信息' }

    return { items: parsed.items }
  } catch (e) {
    console.error('AI recognize error:', e)
    return { error: 'AI 识别失败，请手动填写' }
  }
}
