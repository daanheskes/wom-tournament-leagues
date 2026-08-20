exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Method not allowed.' })
  }

  const suppliedPassKey = event.headers['x-admin-passkey']
  if (!suppliedPassKey || suppliedPassKey !== process.env.WOM_GROUP_VERIFICATION_CODE) {
    return response(401, { message: 'Invalid admin pass-key.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return response(400, { message: 'Invalid request body.' })
  }

  if (body.action === 'authenticate') {
    return response(200, { authenticated: true })
  }

  const requiredFields = ['title', 'metric', 'startsAt', 'endsAt']
  if (requiredFields.some(field => !body[field])) {
    return response(400, { message: 'Missing required competition fields.' })
  }

  try {
    const wiseOldManResponse = await fetch('https://api.wiseoldman.net/v2/competitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title,
        metric: body.metric,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        groupId: 7020,
        groupVerificationCode: process.env.WOM_GROUP_VERIFICATION_CODE,
      }),
    })

    const data = await wiseOldManResponse.json()
    return response(wiseOldManResponse.status, data)
  } catch {
    return response(502, { message: 'WiseOldMan could not be reached.' })
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
