'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const TABLE = process.env.TABLE_NAME;

const resp = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  },
  body: JSON.stringify(body),
});

// Strip DynamoDB housekeeping keys before sending to client
function strip(item) {
  const { PK, SK, ttl, ...rest } = item;
  return rest;
}

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;

    // Single Query fetches every entity for this user
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    }));

    const entities = {
      profile: null,
      incomeSources: [],
      categories: [],
      transactions: [],
      voiceLogs: [],
      chatMessages: [],
    };

    for (const item of result.Items || []) {
      const clean = strip(item);
      if (item.SK === 'PROFILE')                entities.profile = clean;
      else if (item.SK.startsWith('INCOME#'))   entities.incomeSources.push(clean);
      else if (item.SK.startsWith('CATEGORY#')) entities.categories.push(clean);
      else if (item.SK.startsWith('TX#'))       entities.transactions.push(clean);
      else if (item.SK.startsWith('VOICELOG#')) entities.voiceLogs.push(clean);
      else if (item.SK.startsWith('CHAT#'))     entities.chatMessages.push(clean);
    }

    // Sort collections for consistency
    entities.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    entities.chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    entities.voiceLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return resp(200, entities);
  } catch (err) {
    console.error('getUserData error:', err);
    return resp(500, { error: err.message });
  }
};
