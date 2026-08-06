'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;
    const body = JSON.parse(event.body || '{}');

    // Merge new cycle config into the user's PROFILE item
    const item = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      cycleStartDate: body.cycleStartDate,
      cycleFrequency: body.cycleFrequency,
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    const { PK, SK, ...clean } = item;
    return resp(200, { success: true, item: clean });
  } catch (err) {
    console.error('updateCycle error:', err);
    return resp(500, { error: err.message });
  }
};
