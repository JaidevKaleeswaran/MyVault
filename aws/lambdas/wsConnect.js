'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// 24-hour TTL — stale connections auto-expire from the tracking table
const CONNECTION_TTL_SECONDS = 24 * 60 * 60;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    // JWT authorizer rejected the token — API Gateway already handles this,
    // but guard here as a safety net
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    await ddb.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        userId,
        connectedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + CONNECTION_TTL_SECONDS,
      },
    }));

    console.log(`WebSocket CONNECT: connectionId=${connectionId} userId=${userId}`);
    return { statusCode: 200, body: 'Connected' };
  } catch (err) {
    console.error('wsConnect error:', err);
    return { statusCode: 500, body: err.message };
  }
};
