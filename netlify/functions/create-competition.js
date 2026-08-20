exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Method not allowed.' })
  }

  const suppliedGroupCode = (event.headers['x-admin-passkey'] || event.headers['X-Admin-Passkey'])?.trim()
  const groupVerificationCode = process.env.WOM_GROUP_VERIFICATION_CODE?.trim()
  if (!groupVerificationCode) {
    return response(500, { message: 'WOM_GROUP_VERIFICATION_CODE is not configured on the server.' })
  }
  if (!suppliedGroupCode || suppliedGroupCode !== groupVerificationCode) {
    return response(401, { message: 'Invalid group code.' })
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
        groupVerificationCode,
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
