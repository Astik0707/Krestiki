import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, chatId } = await request.json()

    console.log('Received Telegram request:', { message, chatId })

    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.error('Telegram bot token not configured')
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      )
    }

    if (!chatId) {
      console.error('Chat ID not provided')
      return NextResponse.json(
        { error: 'Chat ID not provided' },
        { status: 400 }
      )
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    // Обработка chatId: если username (начинается с @), убираем @, иначе используем как есть (число)
    let chatIdValue: string | number
    let isUsername = false
    if (chatId.startsWith('@')) {
      // Username без @ для Telegram API
      chatIdValue = chatId.substring(1)
      isUsername = true
    } else if (/^\d+$/.test(chatId)) {
      // Если это число, используем как chat_id
      chatIdValue = parseInt(chatId, 10)
    } else {
      // Если не число и не username, пробуем как есть
      chatIdValue = chatId
    }
    
    console.log('Sending to Telegram:', { url: telegramUrl.replace(botToken, 'TOKEN_HIDDEN'), chatId: chatIdValue, message, isUsername })

    // Если это username, сначала попробуем получить chat_id через getUpdates
    // Важно: getUpdates возвращает только последние обновления (обычно 100 за 24 часа)
    // Если пользователь писал боту давно, его сообщение может быть не в обновлениях
    if (isUsername && typeof chatIdValue === 'string') {
      try {
        // Пробуем получить максимум обновлений (limit=100 - максимальное значение)
        const updatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100`
        const updatesResponse = await fetch(updatesUrl)
        
        if (updatesResponse.ok) {
          const updatesData = await updatesResponse.json()
          if (updatesData.ok && updatesData.result && updatesData.result.length > 0) {
            // Ищем пользователя по username в обновлениях (проверяем с конца - самые свежие)
            for (const update of updatesData.result.reverse()) {
              if (update.message?.from) {
                const user = update.message.from
                // Проверяем username (без учета регистра)
                if (user.username && user.username.toLowerCase() === chatIdValue.toLowerCase()) {
                  chatIdValue = user.id
                  console.log('Found chat_id for username from updates:', { username: chatId, chatId: chatIdValue })
                  break
                }
              }
              if (update.message?.chat) {
                const chat = update.message.chat
                if (chat.username && chat.username.toLowerCase() === chatIdValue.toLowerCase()) {
                  chatIdValue = chat.id
                  console.log('Found chat_id for username from chat:', { username: chatId, chatId: chatIdValue })
                  break
                }
              }
            }
          } else {
            console.log('No updates found in getUpdates, will try username directly')
          }
        }
      } catch (e) {
        console.log('Could not get chat_id from updates, will try username directly:', e)
      }
    }
    
    // Если не удалось найти chat_id через getUpdates, попробуем отправить напрямую по username
    // Telegram API может принять username, если пользователь недавно писал боту
    // Но если сообщение было давно (>24 часа), это может не сработать

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatIdValue,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage = 'Failed to send message to Telegram'
      let errorDetails = errorData
      
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.description) {
          errorDetails = errorJson.description
          // Более понятные сообщения для пользователя
          if (errorJson.description.includes('chat not found')) {
            if (isUsername) {
              errorMessage = `Чат не найден для username ${chatId}.\n\n⚠️ ВАЖНО: Telegram API может "забыть" о пользователе, если последнее сообщение было отправлено давно (более 24 часов назад).\n\nДля работы уведомлений:\n1. Откройте Telegram и найдите бота @krestiki_i_noliki01_bot\n2. Напишите боту ЛЮБОЕ сообщение (например "Привет" или "/start")\n3. Убедитесь, что ваш username правильный (${chatId})\n4. Попробуйте снова\n\n💡 Совет: Используйте chat_id вместо username - он работает надежнее (узнайте через @userinfobot)`
            } else {
              errorMessage = 'Чат не найден. Убедитесь, что вы написали боту @krestiki_i_noliki01_bot хотя бы одно сообщение перед использованием уведомлений.\n\n⚠️ Если вы писали боту давно (>24 часа), напишите ему снова - Telegram может "забыть" о старых сообщениях.'
            }
          } else if (errorJson.description.includes('bot was blocked')) {
            errorMessage = 'Бот заблокирован. Разблокируйте бота @krestiki_i_noliki01_bot в Telegram.'
          } else if (errorJson.description.includes('user not found')) {
            errorMessage = 'Пользователь не найден. Проверьте правильность username или chat_id. Убедитесь, что вы написали боту сообщение.'
          }
        }
      } catch (e) {
        // Если не удалось распарсить JSON, используем исходный текст
      }
      
      console.error('Telegram API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        chatId: chatIdValue,
        message: message
      })
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('Telegram message sent successfully:', {
      chatId: chatIdValue,
      message: message
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error sending Telegram message:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

