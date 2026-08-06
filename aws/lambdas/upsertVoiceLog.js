'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const TABLE = process.env.TABLE_NAME;

const VOICE_LOG_TTL_SECONDS = 3 * 24 * 60 * 60; // 3 days

const resp = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;
    const body = JSON.parse(event.body || '{}');

    if (!body.id) return resp(400, { error: 'Missing required field: id' });

    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + VOICE_LOG_TTL_SECONDS;

    const item = {
      PK: `USER#${userId}`,
      SK: `VOICELOG#${body.id}`,
      ...body,
      updatedAt: now,
      createdAt: body.createdAt || now,
      ttl, // DynamoDB auto-deletes after 3 days
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    const { PK, SK, ...clean } = item;
    return resp(201, { success: true, item: clean });
  } catch (err) {
    console.error('upsertVoiceLog error:', err);
    return resp(500, { error: err.message });
  }
};
